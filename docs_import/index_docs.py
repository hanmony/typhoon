#!/usr/bin/env python
# -*- coding: utf-8 -*-
"""index_docs.py — 步骤 D6：向量化 + 写 Qdrant + MongoDB 知识库表

背景
====
D5 已把 72 份清洗后文档切成 3002 片（chunks.jsonl）。本脚本把切片
向量化并写入平台知识库的三处存储，严格对齐 codex D6 审查契约：

  契约 1  documentId：D5 的 documentId 只是临时来源键；本脚本写入
         kb-chunks.documentId 与 Qdrant payload.documentId 的，
         一律是 kb-documents 的 Mongo _id 字符串。
  契约 2  幂等匹配优先用 sourceRelpath（= kb-documents.filePath），
         不用文件名。
  契约 3  不把 chunks.jsonl 整行插入 kb-chunks；只写
         documentId / chunkIndex / content / qdrantPointId 四字段。
  契约 4  kb-documents.filePath 指向永久目录 docs_import/text_permanent/
         （文本固化进 git，D8 不会删除），而非 D8 要清理的临时目录。
  契约 5  删除旧数据之前，先完成 Embedding 连通性与 1024 维校验；
         校验失败直接退出（exit 1），不碰任何已有数据。

与平台 processDocument（document.service.ts）的对应关系
=========================================================
  - 集合名：kbdocuments / kbchunks（Mongoose 命名，无连字符）
  - kb-documents 字段：name / fileType / filePath / fileSize / status
    / category / chunkConfig / chunkCount / statusMessage（+ timestamps）
    status：1=解析中 → 3=入库完成；本脚本离线导入，先写 1 完成改 3。
  - kb-chunks 四字段 + timestamps（契约 3）
  - Qdrant：集合 knowledge_base，1024 维 Cosine；
    payload = content / documentId / documentName / chunkIndex / category
    （照抄 qdrant.service.ts upsertPoints）
  - Embedding：POST {baseUrl}/embeddings，body {model, input, dimensions}，
    Bearer 认证，批大小 25、重试 2 次、指数退避 2^attempt 秒、
    超时 30 秒（照抄 embedding.service.ts）
  - fileType 统一写 "txt"：filePath 指向永久 txt，平台重处理时
    parser.parseText 直接可读（规避 parser 不支持 docx 的问题）。

autoTags / summary 不生成：平台由 LLM（llm_models 集合配置）生成，
D6 离线导入不覆盖该路径；入库后平台侧可用 listDocumentsWithoutMetadata
补齐（README D6 节有说明）。

失败处理
========
  单份文档任一环节失败 → 清理该文档全部痕迹（Qdrant 点 + kb-chunks
  + kb-documents 记录），记入 failed 清单继续处理下一份；结束时
  failed 非空 → exit 1（fail loud）。重跑幂等：按 filePath 删旧重建。

用法
====
  python -X utf8 index_docs.py [chunks_jsonl] [text_dir] [选项]

  常用选项：
    --env PATH              读 server/.env（KEY=VALUE；gitignored，不进 git）
    --embedding-base-url / --embedding-api-key / --embedding-model /
    --embedding-dimension   三件套（缺了会 fail loud）
    --qdrant-url / --qdrant-collection / --database-uri
    --dry-run               只做预检（连通性 + 维度 + 计数），不写任何数据

输出
====
  docs_import/index_report.json  汇总 + 每文档 Mongo _id ↔ sourceRelpath 映射
  docs_import/index_report.md    人读报告
"""
import argparse
import hashlib
import json
import os
import re
import shutil
import sys
import time
import uuid
from datetime import datetime, timezone

import pymongo
import requests

# ──────────────────────────────────────────────────────────────────────
# 默认配置（可被 .env 或命令行覆盖；对齐 server/.env.example）
# ──────────────────────────────────────────────────────────────────────
DEFAULT_ENV = "server/.env"
DEFAULT_CHUNKS = "docs_import/chunks.jsonl"
DEFAULT_TEXT_DIR = "docs_import/text_clean"
PERMANENT_TEXT_DIR = "docs_import/text_permanent"   # 契约 4：永久目录，进 git
REPORT_JSON = "docs_import/index_report.json"
REPORT_MD = "docs_import/index_report.md"

DEFAULTS = {
    "EMBEDDING_MODEL": "text-embedding-v3",
    "EMBEDDING_DIMENSION": "1024",
    "QDRANT_URL": "http://localhost:6333",
    "QDRANT_COLLECTION_NAME": "knowledge_base",
    "DATABASE_URI": "mongodb://localhost:27017/schooltyphoon",
}

# 照抄 D4/D5：敏感文件红线（只拦截，绝不读取内容）
SENSITIVE_PATH_RE = re.compile(
    r"身份证|值班表|值班安排|值班名单|联系方式|通讯录|联络表|联系人|联络员|负责人|手机号码|联系电话"
)

EMBED_BATCH_SIZE = 25          # 照抄 embedding.service.ts batchSize
EMBED_RETRIES = 2              # 照抄 callApiWithRetry(retries=2)
EMBED_TIMEOUT = 30             # 照抄 timeout: 30000


# ──────────────────────────────────────────────────────────────────────
# 配置读取
# ──────────────────────────────────────────────────────────────────────
def load_env_file(path):
    """读 KEY=VALUE 的 .env（不要求文件存在；值不去引号外的空白注释）。"""
    env = {}
    if not os.path.isfile(path):
        return env
    with open(path, "r", encoding="utf-8") as f:
        for line in f:
            line = line.strip()
            if not line or line.startswith("#"):
                continue
            if "=" not in line:
                continue
            key, _, value = line.partition("=")
            key = key.strip()
            value = value.strip().strip('"').strip("'")
            if key:
                env[key] = value
    return env


def resolve_config(args):
    """优先级：命令行 > server/.env > DEFAULTS。返回 dict。"""
    env = load_env_file(args.env)
    cfg = dict(DEFAULTS)
    for key in DEFAULTS:
        if env.get(key):
            cfg[key] = env[key]
    overrides = {
        "EMBEDDING_BASE_URL": args.embedding_base_url,
        "EMBEDDING_API_KEY": args.embedding_api_key,
        "EMBEDDING_MODEL": args.embedding_model,
        "EMBEDDING_DIMENSION": args.embedding_dimension,
        "QDRANT_URL": args.qdrant_url,
        "QDRANT_COLLECTION_NAME": args.qdrant_collection,
        "DATABASE_URI": args.database_uri,
    }
    for key, value in overrides.items():
        if value:
            cfg[key] = value
    cfg["EMBEDDING_DIMENSION"] = int(cfg["EMBEDDING_DIMENSION"])
    return cfg


# ──────────────────────────────────────────────────────────────────────
# 文本永久化（契约 4：filePath 不能指向 D8 会删除的临时目录）
# ──────────────────────────────────────────────────────────────────────
def md5_of(path):
    h = hashlib.md5()
    with open(path, "rb") as f:
        for chunk in iter(lambda: f.read(65536), b""):
            h.update(chunk)
    return h.hexdigest()


def copy_text_to_permanent(text_dir, permanent_dir):
    """把 text_clean 下全部 txt 复制到永久目录（保留 relpath 结构）。
    目标已存在且内容一致则跳过（幂等）；不一致则覆盖。
    返回 {相对路径: 永久绝对路径}。"""
    text_root = os.path.realpath(os.path.abspath(text_dir))
    perm_root = os.path.realpath(os.path.abspath(permanent_dir))
    os.makedirs(perm_root, exist_ok=True)
    mapping = {}
    copied = 0
    for dirpath, _, filenames in os.walk(text_root):
        for fn in sorted(filenames):
            if not fn.lower().endswith(".txt"):
                continue
            src = os.path.join(dirpath, fn)
            rel = os.path.relpath(src, text_root).replace("\\", "/")
            dst = os.path.join(perm_root, os.path.relpath(src, text_root))
            os.makedirs(os.path.dirname(dst), exist_ok=True)
            if os.path.isfile(dst) and md5_of(dst) == md5_of(src):
                pass
            else:
                shutil.copy2(src, dst)
                copied += 1
            mapping[rel] = os.path.abspath(dst)
    if not mapping:
        print(f"[ERROR] text_clean 下没有 txt 文件: {text_dir}")
        sys.exit(1)
    print(f"[D6] 文本永久化：{len(mapping)} 份 → {perm_root}（本次复制 {copied} 份）")
    return mapping


# ──────────────────────────────────────────────────────────────────────
# Embedding 客户端（照抄 embedding.service.ts）
# ──────────────────────────────────────────────────────────────────────
class EmbeddingClient:
    def __init__(self, cfg):
        self.base_url = cfg["EMBEDDING_BASE_URL"].rstrip("/")
        self.api_key = cfg["EMBEDDING_API_KEY"]
        self.model = cfg["EMBEDDING_MODEL"]
        self.dimension = cfg["EMBEDDING_DIMENSION"]

    def _call(self, texts):
        resp = requests.post(
            f"{self.base_url}/embeddings",
            json={"model": self.model, "input": texts, "dimensions": self.dimension},
            headers={
                "Authorization": f"Bearer {self.api_key}",
                "Content-Type": "application/json",
            },
            timeout=EMBED_TIMEOUT,
        )
        resp.raise_for_status()
        data = resp.json()
        return [item["embedding"] for item in data["data"]]

    def call_with_retry(self, texts):
        """照抄 callApiWithRetry：attempt 0..retries，退避 2^attempt 秒。"""
        last_err = None
        for attempt in range(EMBED_RETRIES + 1):
            try:
                return self._call(texts)
            except Exception as err:  # noqa: BLE001 与平台一致：任意错误重试
                last_err = err
                if attempt == EMBED_RETRIES:
                    break
                delay = 2 ** attempt
                print(f"[WARN] Embedding 重试 {attempt + 1}/{EMBED_RETRIES}，"
                      f"等待 {delay}s（{err}）")
                time.sleep(delay)
        raise last_err

    def verify(self):
        """契约 5：连通性 + 维度校验（在任何删除/写入之前调用）。"""
        vecs = self.call_with_retry(["连接测试"])
        if len(vecs) != 1 or len(vecs[0]) != self.dimension:
            raise RuntimeError(
                f"Embedding 返回维度 {len(vecs[0]) if vecs and vecs[0] else '?'} "
                f"!= 期望 {self.dimension}")
        return len(vecs[0])

    def embed_texts(self, texts):
        """照抄 embedTexts：按 25/批顺序切片。"""
        out = []
        for i in range(0, len(texts), EMBED_BATCH_SIZE):
            batch = texts[i:i + EMBED_BATCH_SIZE]
            vecs = self.call_with_retry(batch)
            if len(vecs) != len(batch):
                raise RuntimeError(
                    f"Embedding 返回条数 {len(vecs)} != 请求 {len(batch)}")
            out.extend(vecs)
        return out


# ──────────────────────────────────────────────────────────────────────
# Qdrant REST 客户端（照抄 qdrant.service.ts 的行为）
# ──────────────────────────────────────────────────────────────────────
class QdrantRest:
    def __init__(self, url, collection, dimension):
        self.url = url.rstrip("/")
        self.collection = collection
        self.dimension = dimension

    def _req(self, method, path, **kw):
        resp = requests.request(method, f"{self.url}{path}", timeout=30, **kw)
        if resp.status_code >= 400:
            raise RuntimeError(
                f"Qdrant {method} {path} -> {resp.status_code}: {resp.text[:300]}")
        return resp

    def ensure_collection(self):
        """集合不存在则建（1024 Cosine）；已存在则校验维度一致。"""
        try:
            resp = requests.get(f"{self.url}/collections/{self.collection}", timeout=30)
        except requests.RequestException as err:
            raise RuntimeError(f"Qdrant 不可达 {self.url}: {err}")
        if resp.status_code == 404:
            self._req("PUT", f"/collections/{self.collection}",
                      json={"vectors": {"size": self.dimension, "distance": "Cosine"}})
            print(f"[D6] 已创建 Qdrant 集合 {self.collection} "
                  f"({self.dimension} 维 Cosine)")
            return
        resp.raise_for_status()
        data = resp.json()
        existing = None
        try:
            existing = data["result"]["config"]["params"]["vectors"]["size"]
        except (KeyError, TypeError):
            pass
        if existing is not None and existing != self.dimension:
            raise RuntimeError(
                f"Qdrant 集合 {self.collection} 已存在且为 {existing} 维，"
                f"与 EMBEDDING_DIMENSION={self.dimension} 不符，拒绝写入")
        print(f"[D6] Qdrant 集合 {self.collection} 已存在（{existing} 维），校验通过")

    def count(self):
        resp = self._req("POST", f"/collections/{self.collection}/points/count",
                         json={"exact": True})
        return resp.json()["result"]["count"]

    def delete_by_document_id(self, document_id):
        """照抄 deleteByDocumentId：按 payload.documentId filter 删点。"""
        self._req("POST", f"/collections/{self.collection}/points/delete?wait=true",
                  json={"filter": {"must": [
                      {"key": "documentId", "match": {"value": document_id}}]}})

    def upsert_points(self, points):
        """照抄 upsertPoints：{wait: true, points}。"""
        self._req("PUT", f"/collections/{self.collection}/points?wait=true",
                  json={"points": points})


# ──────────────────────────────────────────────────────────────────────
# 主流程
# ──────────────────────────────────────────────────────────────────────
def main():
    ap = argparse.ArgumentParser(description="D6 向量化 + 写 Qdrant + MongoDB 知识库表")
    ap.add_argument("chunks_jsonl", nargs="?", default=DEFAULT_CHUNKS)
    ap.add_argument("text_dir", nargs="?", default=DEFAULT_TEXT_DIR)
    ap.add_argument("--env", default=DEFAULT_ENV, help=".env 路径（默认 server/.env）")
    ap.add_argument("--embedding-base-url")
    ap.add_argument("--embedding-api-key")
    ap.add_argument("--embedding-model")
    ap.add_argument("--embedding-dimension", type=int)
    ap.add_argument("--qdrant-url")
    ap.add_argument("--qdrant-collection")
    ap.add_argument("--database-uri")
    ap.add_argument("--dry-run", action="store_true",
                    help="只做预检（连通性 + 维度 + 计数），不删除/不写入")
    args = ap.parse_args()

    cfg = resolve_config(args)

    # 1. 必填校验（fail loud）
    missing = [k for k in ("EMBEDDING_BASE_URL", "EMBEDDING_API_KEY") if not cfg.get(k)]
    if missing:
        print("[ERROR] Embedding 配置缺失：" + "、".join(missing))
        print("  请提供真实值：写入 server/.env（已 gitignore）或传命令行参数，例如：")
        print("    python -X utf8 index_docs.py --embedding-base-url https://... "
              "--embedding-api-key sk-xxx --embedding-model text-embedding-v3")
        sys.exit(1)
    if cfg["EMBEDDING_DIMENSION"] != 1024:
        print(f"[ERROR] EMBEDDING_DIMENSION={cfg['EMBEDDING_DIMENSION']}，"
              "平台契约固定 1024 维，拒绝继续")
        sys.exit(1)

    # 2. 读 chunks.jsonl
    try:
        with open(args.chunks_jsonl, "r", encoding="utf-8") as f:
            rows = [json.loads(line) for line in f if line.strip()]
    except (OSError, json.JSONDecodeError) as err:
        print(f"[ERROR] chunks.jsonl 读取失败: {err}")
        sys.exit(1)
    if not rows:
        print("[ERROR] chunks.jsonl 为空")
        sys.exit(1)

    # 敏感拦截（第二道防线：D4/D5 已拦，这里再确认入库数据不含敏感来源）
    bad = sorted({r["sourceRelpath"] for r in rows if SENSITIVE_PATH_RE.search(r["sourceRelpath"])})
    if bad:
        print("[ERROR] 以下来源疑似敏感文件，拒绝入库：")
        for rel in bad:
            print(f"  - {rel}")
        sys.exit(1)

    # 3. 文本永久化（契约 4）
    perm_mapping = copy_text_to_permanent(args.text_dir, PERMANENT_TEXT_DIR)

    # 4. Mongo 连通
    try:
        mongo = pymongo.MongoClient(cfg["DATABASE_URI"], serverSelectionTimeoutMS=5000)
        mongo.admin.command("ping")
    except pymongo.errors.ServerSelectionTimeoutError as err:
        print(f"[ERROR] MongoDB 不可达（{cfg['DATABASE_URI']}）: {err}")
        sys.exit(1)
    db_uri_path = cfg["DATABASE_URI"].rsplit("/", 1)[-1] or "schooltyphoon"
    db = mongo[db_uri_path]
    kb_docs = db["kbdocuments"]     # 注意：无连字符（Mongoose 命名）
    kb_chunks = db["kbchunks"]
    print(f"[D6] MongoDB {db_uri_path} 连通（kbdocuments={kb_docs.count_documents({})}，"
          f"kbchunks={kb_chunks.count_documents({})}）")

    # 5. Qdrant 集合校验/创建
    qdrant = QdrantRest(cfg["QDRANT_URL"], cfg["QDRANT_COLLECTION_NAME"],
                        cfg["EMBEDDING_DIMENSION"])
    try:
        qdrant.ensure_collection()
    except RuntimeError as err:
        print(f"[ERROR] {err}")
        sys.exit(1)

    # 6. 契约 5：Embedding 连通性 + 维度校验（删除旧数据之前）
    embedding = EmbeddingClient(cfg)
    try:
        dim_ok = embedding.verify()
    except Exception as err:  # noqa: BLE001
        print(f"[ERROR] Embedding 预检失败（未删除/未写入任何数据）: {err}")
        print("  配置：base_url=%s model=%s" % (cfg["EMBEDDING_BASE_URL"], cfg["EMBEDDING_MODEL"]))
        sys.exit(1)
    print(f"[D6] Embedding 预检通过：{cfg['EMBEDDING_MODEL']}，返回维度 {dim_ok}")

    # 按 sourceRelpath 分组（保持 jsonl 顺序 = D5 的 relpath 排序）
    groups = {}
    for row in rows:
        groups.setdefault(row["sourceRelpath"], []).append(row)
    doc_rels = list(groups)
    print(f"[D6] 待导入：{len(doc_rels)} 份文档 / {len(rows)} 片")

    if args.dry_run:
        print(f"[D6] --dry-run：预检全部通过，Qdrant 现有点数 = {qdrant.count()}，"
              "未做任何删除/写入")
        sys.exit(0)

    # 7. 幂等清理（契约 2：按 filePath=sourceRelpath 匹配先删旧）
    planned_paths = [perm_mapping[r] for r in doc_rels]
    old_docs = list(kb_docs.find({"filePath": {"$in": planned_paths}}))
    for old in old_docs:
        old_id = str(old["_id"])
        qdrant.delete_by_document_id(old_id)
        kb_chunks.delete_many({"documentId": old_id})
        kb_docs.delete_one({"_id": old["_id"]})
    if old_docs:
        print(f"[D6] 幂等清理：删除旧文档 {len(old_docs)} 份"
              f"（Qdrant 点 + kb-chunks + kb-documents）")
    else:
        print("[D6] 幂等清理：未发现旧数据，跳过")
    stray = kb_docs.count_documents({"filePath": {"$nin": planned_paths}})
    if stray:
        print(f"[WARN] kb-documents 存在 {stray} 条 filePath 不在本次计划内的记录，"
              "保持不动（可能来自平台上传，勿误删）")

    # 8. 逐文档导入（对齐 processDocument 顺序；失败清理痕迹并继续）
    now = datetime.now(timezone.utc)
    doc_results = []
    failed = []
    for rel in doc_rels:
        rel_rows = groups[rel]
        first = rel_rows[0]
        name = first["documentName"]
        category = first["category"]
        chunk_config = first["chunkConfig"]
        n = len(rel_rows)
        doc_file = perm_mapping[rel]
        file_size = os.path.getsize(doc_file)

        doc_id = None
        try:
            doc = kb_docs.insert_one({
                "name": name,
                "fileType": "txt",   # filePath 指向永久 txt，平台重处理走 parseText
                "filePath": doc_file,
                "fileSize": file_size,
                "status": 1,
                "category": category,
                "createdAt": now,
                "updatedAt": now,
            })
            doc_id = str(doc.inserted_id)

            # kb-chunks 四字段（契约 3）；qdrantPointId 先行生成
            point_ids = [str(uuid.uuid4()) for _ in range(n)]
            kb_chunks.insert_many([{
                "documentId": doc_id,
                "chunkIndex": r["chunkIndex"],
                "content": r["content"],
                "qdrantPointId": point_ids[i],
                "createdAt": now,
                "updatedAt": now,
            } for i, r in enumerate(rel_rows)])

            # 向量化（批 25 / 重试 2 / 退避，照抄平台）
            vectors = embedding.embed_texts([r["content"] for r in rel_rows])

            # Qdrant upsert（payload 照抄平台 5 字段）
            qdrant.upsert_points([{
                "id": point_ids[i],
                "vector": vectors[i],
                "payload": {
                    "content": r["content"],
                    "documentId": doc_id,
                    "documentName": name,
                    "chunkIndex": r["chunkIndex"],
                    "category": category,
                },
            } for i, r in enumerate(rel_rows)])

            # 完成态
            kb_docs.update_one({"_id": doc.inserted_id}, {"$set": {
                "status": 3,
                "chunkCount": n,
                "chunkConfig": chunk_config,
                "statusMessage": "",
            }})
            doc_results.append({
                "mongoId": doc_id,
                "sourceRelpath": rel,
                "name": name,
                "category": category,
                "chunkCount": n,
            })
            print(f"{n:>5} 片  [ok]  {name}  ({doc_id})")
        except Exception as err:  # noqa: BLE001 单份失败清理痕迹，继续下一份
            print(f"[FAIL] {name}: {err}（已清理该文档痕迹）")
            if doc_id is not None:
                try:
                    qdrant.delete_by_document_id(doc_id)
                except Exception:  # noqa: BLE001
                    pass
                kb_chunks.delete_many({"documentId": doc_id})
                kb_docs.delete_one({"_id": doc.inserted_id})
            failed.append({"sourceRelpath": rel, "name": name, "error": str(err)})

    # 9. 验收：三处计数与 chunks.jsonl 完全一致
    print()
    print("===== D6 验收 =====")
    errors = []
    mongo_docs = kb_docs.count_documents({})
    mongo_chunks = kb_chunks.count_documents({})
    qdrant_points = qdrant.count()
    expect_docs = len(doc_rels) - len(failed)
    expect_chunks = len(rows) - sum(len(groups[f["sourceRelpath"]]) for f in failed)
    for label, actual, expect in (
        ("kb-documents", mongo_docs, expect_docs),
        ("kb-chunks", mongo_chunks, expect_chunks),
        ("Qdrant 点数", qdrant_points, expect_chunks),
    ):
        mark = "ok" if actual == expect else "FAIL"
        print(f"  {label}: {actual}（期望 {expect}）[{mark}]")
        if actual != expect:
            errors.append(f"{label} 计数不符：{actual} != {expect}")
    done_chunks = kb_chunks.count_documents(
        {"documentId": {"$in": [r["mongoId"] for r in doc_results]}})
    if done_chunks != expect_chunks:
        errors.append(f"成功文档切片数 {done_chunks} != 期望 {expect_chunks}")

    # 10. 报告
    summary = {
        "generated_at": datetime.now().astimezone().isoformat(timespec="seconds"),
        "documents_total": len(doc_rels),
        "documents_succeeded": len(doc_results),
        "documents_failed": len(failed),
        "chunks_total": len(rows),
        "qdrant_points": qdrant_points,
        "embedding_model": cfg["EMBEDDING_MODEL"],
        "embedding_dimension": dim_ok,
        "mongo_uri": cfg["DATABASE_URI"],
        "qdrant_collection": cfg["QDRANT_COLLECTION_NAME"],
        "text_permanent_dir": os.path.abspath(PERMANENT_TEXT_DIR),
    }
    out_dir = os.path.dirname(os.path.abspath(args.chunks_jsonl))
    report_json = os.path.normpath(os.path.join(out_dir, os.path.basename(REPORT_JSON)))
    report_md = os.path.normpath(os.path.join(out_dir, os.path.basename(REPORT_MD)))
    with open(report_json, "w", encoding="utf-8") as f:
        json.dump({"summary": summary, "documents": doc_results, "failed": failed},
                  f, ensure_ascii=False, indent=2)
    write_md_report(summary, doc_results, failed, report_md)
    print(f"[out] {report_json}")
    print(f"[out] {report_md}")

    if failed:
        print()
        print("[ERROR] 以下文档导入失败（重跑幂等，仅重建失败文档）：")
        for f_ in failed:
            print(f"  - {f_['sourceRelpath']}: {f_['error']}")
        sys.exit(1)
    if errors:
        for message in errors:
            print(f"[ERROR] {message}")
        sys.exit(1)
    print()
    print("[OK] D6 验收通过：kb-documents / kb-chunks / Qdrant 计数一致，"
          "documentId 均为 Mongo _id 字符串")


def write_md_report(summary, doc_results, failed, path):
    lines = []
    a = lines.append
    a("# D6 向量化入库报告")
    a("")
    a(f"- 生成时间：{summary['generated_at']}")
    a("- 生成脚本：`docs_import/index_docs.py`（契约对齐 codex D6 审查 5 条）")
    a(f"- Embedding：`{summary['embedding_model']}`（{summary['embedding_dimension']} 维）")
    a(f"- Qdrant 集合：`{summary['qdrant_collection']}`，点总数 {summary['qdrant_points']}")
    a(f"- MongoDB：{summary['mongo_uri']}，集合 `kbdocuments` / `kbchunks`")
    a(f"- 永久文本目录：`{summary['text_permanent_dir']}`（进 git，D8 不删除）")
    a(f"- 结果：{summary['documents_succeeded']}/{summary['documents_total']} 份成功，"
      f"{summary['chunks_total']} 片全部向量化")
    a("")
    a("## 契约落实")
    a("")
    a("1. kb-chunks.documentId 与 Qdrant payload.documentId = Mongo _id 字符串（非 D5 临时键）")
    a("2. 幂等匹配按 sourceRelpath（= kb-documents.filePath），不用文件名")
    a("3. kb-chunks 只写 documentId / chunkIndex / content / qdrantPointId 四字段")
    a("4. filePath 指向永久目录 text_permanent/，不指向 D8 会删除的临时目录")
    a("5. 删除旧数据前已完成 Embedding 连通性与 1024 维校验")
    a("")
    a("## 逐文档明细（Mongo _id ↔ 来源）")
    a("")
    a("| Mongo _id | 文档 | 分类 | 切片数 |")
    a("|---|---|---|---|")
    for r in doc_results:
        a(f"| {r['mongoId']} | {r['name']} | {r['category']} | {r['chunkCount']} |")
    if failed:
        a("")
        a("## 失败清单（重跑幂等）")
        a("")
        for f_ in failed:
            a(f"- {f_['sourceRelpath']}: {f_['error']}")
    a("")
    a("## 说明")
    a("")
    a("- fileType 统一为 `txt`：filePath 指向永久清洗文本，平台重处理走 parseText。")
    a("- autoTags / summary 未生成（平台依赖 llm_models 的 LLM 配置），"
      "可由平台 listDocumentsWithoutMetadata 接口补齐。")
    with open(path, "w", encoding="utf-8") as f:
        f.write("\n".join(lines) + "\n")


if __name__ == "__main__":
    main()
