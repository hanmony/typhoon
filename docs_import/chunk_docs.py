#!/usr/bin/env python
# -*- coding: utf-8 -*-
"""chunk_docs.py — 步骤 D5：切片（chunking），按平台 4 类预设切块

背景
====
D4 清洗后的 txt 太长（几百 KB），不能直接向量化：
  - 模型输入有长度限制，大段混在一起检索不精准；
  - 平台知识库问答按「切片」检索（Qdrant 每点 = 一个切片）。

本脚本把每份 txt 按平台 `chunk.service.ts` 的 `CATEGORY_CHUNK_PRESETS`
切成小块，算法（chunkByParagraph / chunkText / findBreakPoint）逐行照抄
平台 TypeScript 实现，保证离线切片与平台在线切片行为一致。

分类预设（照抄 CATEGORY_CHUNK_PRESETS）
========================================
  typhoon_case   paragraph      800 / 80
  regulation     paragraph      500 / 50
  emergency_plan paragraph      600 / 60
  other          sliding_window 500 / 50

两种策略的区别（README 概念小课堂）：
  - paragraph：按空行分段（D4 R5 已把连续空行压成 1 个，段间恰为 "\\n\\n"），
    小段累积到接近 chunkSize 即切，上一块尾部 overlap 字符带进下一块开头；
  - sliding_window：定长窗口向前滚（含断点对齐），段边界不断开。
    论文长段落多、句式密，用滑窗最稳。

输出
====
  docs_import/chunks.jsonl     每行一个切片 JSON：
      {documentId, documentName, category, chunkIndex, content, chunkConfig}
  docs_import/chunk_report.json 汇总统计（脚本可核对）
  docs_import/chunk_report.md   人读报告（分类计数 + 每文档切片数）

字段约定（对齐 kb-chunks.schema / D6 用法）
============================================
  documentId   = 源文件相对路径（去扩展名，唯一稳定；D6 导入时映射到
                 kb-documents 的 Mongo _id 后写入 kb-chunks.documentId）
  documentName = 源文件名（kb-documents.name）
  chunkIndex   = 文档内从 0 连续编号（kb-chunks.chunkIndex）
  chunkConfig  = 该分类的 {strategy, chunkSize, overlap}（kb-documents.chunkConfig）

验收兜底
========
  任何一份文档切片数为 0 → 退出码 1（fail loud，防止静默漏切）。
幂等：输入只读，重跑覆盖输出。
"""
import argparse
import json
import os
import re
import sys
from datetime import datetime

# ──────────────────────────────────────────────────────────────────────
# 配置区
# ──────────────────────────────────────────────────────────────────────
DEFAULT_META = "docs_import/extract_metadata.json"
DEFAULT_IN = "docs_import/text_clean"
DEFAULT_OUT = "docs_import/chunks.jsonl"
REPORT_JSON = "docs_import/chunk_report.json"
REPORT_MD = "docs_import/chunk_report.md"

# 照抄 server/src/knowledge-base/service/chunk.service.ts 的 CATEGORY_CHUNK_PRESETS
CATEGORY_CHUNK_PRESETS = {
    "typhoon_case": {"strategy": "paragraph", "chunkSize": 800, "overlap": 80},
    "regulation": {"strategy": "paragraph", "chunkSize": 500, "overlap": 50},
    "emergency_plan": {"strategy": "paragraph", "chunkSize": 600, "overlap": 60},
    "other": {"strategy": "sliding_window", "chunkSize": 500, "overlap": 50},
}

SENSITIVE_PATH_RE = re.compile(
    r"身份证|值班表|值班安排|值班名单|联系方式|通讯录|联络表|联系人|联络员|负责人|手机号码|联系电话"
)

# findBreakPoint 的断点字符（照抄平台）
BREAK_CHARS = set("\n。！？.!?；;")


# ──────────────────────────────────────────────────────────────────────
# 平台算法移植（逐行对照 chunk.service.ts）
# ──────────────────────────────────────────────────────────────────────
def resolve_under(root, relpath):
    """解析相对路径，拒绝绝对路径或 ../ 越界（沿用 D3/D4 加固逻辑）。"""
    if not isinstance(relpath, str) or not relpath.strip():
        raise ValueError("路径为空")
    rel_os = relpath.replace("/", os.sep)
    if os.path.isabs(rel_os):
        raise ValueError(f"必须是相对路径: {relpath}")
    root_abs = os.path.realpath(os.path.abspath(root))
    full = os.path.realpath(os.path.abspath(os.path.join(root_abs, rel_os)))
    try:
        if os.path.commonpath([root_abs, full]) != root_abs:
            raise ValueError(f"路径越界: {relpath}")
    except ValueError:
        raise ValueError(f"路径越界: {relpath}")
    return full


def text_relpath(relpath):
    """D4 输出 txt 的相对路径 = 源 relpath 去扩展名 + .txt"""
    return os.path.splitext(relpath)[0] + ".txt"


def find_break_point(text, pos, tolerance):
    """照抄 chunk.service.ts 的 findBreakPoint：在 pos±tolerance 窗口内
    找最后一个断点字符，返回断点后一位；找不到返回 pos。
    注意 JS 端 `end` 可能等于 len(text)（text[end] 为 undefined 不匹配），
    Python 端 i < len(text) 等价跳过。"""
    start = max(0, int(pos - tolerance))
    end = min(len(text), int(pos + tolerance))
    for i in range(end, start - 1, -1):
        if i < len(text) and text[i] in BREAK_CHARS:
            return i + 1
    return pos


def chunk_text(text, chunk_size, overlap):
    """照抄 chunk.service.ts 的 chunkText（滑窗 + 断点对齐）。"""
    ov = min(overlap, chunk_size - 1)

    if len(text) <= chunk_size:
        return [text.strip()] if text.strip() else []

    chunks = []
    start = 0

    while start < len(text):
        end = min(start + chunk_size, len(text))

        if end < len(text):
            break_point = find_break_point(text, end, chunk_size * 0.2)
            if break_point > start:
                end = break_point

        chunk = text[start:end].strip()
        if chunk:
            chunks.append(chunk)

        nxt = end - ov
        if nxt <= start:
            start = end
        else:
            start = nxt

    return chunks


def chunk_by_paragraph(text, chunk_size, overlap):
    """照抄 chunk.service.ts 的 chunkByParagraph（按空行分段累积）。
    单段超长回退到 chunkText 滑窗；累积接近 chunkSize 即切，
    上一块尾部 overlap 字符带进下一块开头（平台重叠语义）。"""
    paragraphs = [p.strip() for p in re.split(r"\n{2,}", text)]
    paragraphs = [p for p in paragraphs if p]
    if not paragraphs:
        return []

    chunks = []
    current = ""

    for para in paragraphs:
        # 单段超长，回退到滑动窗口
        if len(para) > chunk_size:
            if current.strip():
                chunks.append(current.strip())
                current = ""
            chunks.extend(chunk_text(para, chunk_size, overlap))
            continue

        # 累积合并
        candidate = current + "\n\n" + para if current else para
        if len(candidate) > chunk_size and current.strip():
            chunks.append(current.strip())
            # overlap: 取上一段尾部
            tail = current[max(0, len(current) - overlap):]
            current = tail + "\n\n" + para
        else:
            current = candidate

    if current.strip():
        chunks.append(current.strip())

    return chunks


# ──────────────────────────────────────────────────────────────────────
# 主流程
# ──────────────────────────────────────────────────────────────────────
def main():
    ap = argparse.ArgumentParser(description="D5 切片：按平台预设对清洗后 txt 切块")
    ap.add_argument("meta", nargs="?", default=DEFAULT_META, help="extract_metadata.json")
    ap.add_argument("in_dir", nargs="?", default=DEFAULT_IN, help="text_clean 目录")
    ap.add_argument("out", nargs="?", default=DEFAULT_OUT, help="chunks.jsonl 路径")
    args = ap.parse_args()

    # 预检：元数据可读、路径约束、敏感拦截（沿用 D4 预检加固）
    try:
        with open(args.meta, "r", encoding="utf-8") as f:
            meta = json.load(f)
    except (OSError, json.JSONDecodeError) as e:
        print(f"[ERROR] 元数据读取失败: {e}")
        sys.exit(1)
    docs = meta.get("documents")
    if not isinstance(docs, list):
        print("[ERROR] 元数据缺少 documents 列表")
        sys.exit(1)

    ok_docs = [d for d in docs if d.get("status") in ("ok", "suspect_scan")]
    print(f"[D5] 元数据共 {len(docs)} 份，纳入切片 {len(ok_docs)} 份"
          f"（status=ok/suspect_scan）")

    in_root = os.path.realpath(os.path.abspath(args.in_dir))
    if not os.path.isdir(in_root):
        print(f"[ERROR] 输入目录不存在: {args.in_dir}")
        sys.exit(1)

    preflight_errors = []
    jobs = []
    for d in ok_docs:
        rel = d.get("relpath")
        if isinstance(rel, str) and SENSITIVE_PATH_RE.search(rel):
            preflight_errors.append(f"元数据疑似包含敏感文件，拒绝读取: {rel}")
            continue
        category = d.get("category", "other")
        if category not in CATEGORY_CHUNK_PRESETS:
            preflight_errors.append(f"未知分类 {category!r}: {rel}")
            continue
        try:
            src = resolve_under(in_root, text_relpath(rel))
        except (TypeError, ValueError) as e:
            preflight_errors.append(str(e))
            continue
        if not os.path.isfile(src):
            preflight_errors.append(f"txt 不存在: {text_relpath(rel)}")
            continue
        jobs.append((d, src))

    if preflight_errors:
        print("[ERROR] 预检未通过：")
        for message in preflight_errors:
            print(f"  - {message}")
        sys.exit(1)

    # 逐份切片（结果缓存到 jobs，写 chunks.jsonl 时复用，保证统计与输出一致）
    out_dir = os.path.dirname(os.path.abspath(args.out))
    os.makedirs(out_dir, exist_ok=True)
    doc_results = []
    empty_docs = []
    total_chunks = 0
    sliced = []   # [(d, src, chunks)]

    for d, src in sorted(jobs, key=lambda x: x[0].get("relpath", "")):
        rel = d["relpath"]
        name = d.get("name") or os.path.basename(rel)
        category = d.get("category", "other")
        config = CATEGORY_CHUNK_PRESETS[category]
        with open(src, "r", encoding="utf-8") as f:
            text = f.read()

        if config["strategy"] == "paragraph":
            chunks = chunk_by_paragraph(text, config["chunkSize"], config["overlap"])
        else:
            chunks = chunk_text(text, config["chunkSize"], config["overlap"])

        if not chunks:
            empty_docs.append(rel)
        sliced.append((d, src, chunks))
        doc_results.append({
            "documentId": os.path.splitext(rel)[0],
            "documentName": name,
            "category": category,
            "chunkCount": len(chunks),
            "chunkConfig": config,
        })
        total_chunks += len(chunks)
        print(f"{len(chunks):>5} 片  [{category:<14}] {rel}")

    # 写 chunks.jsonl（chunkIndex 文档内从 0 连续）
    with open(args.out, "w", encoding="utf-8") as f:
        for d, src, chunks in sliced:
            rel = d["relpath"]
            category = d.get("category", "other")
            config = CATEGORY_CHUNK_PRESETS[category]
            for i, chunk in enumerate(chunks):
                row = {
                    "documentId": os.path.splitext(rel)[0],
                    "documentName": d.get("name") or os.path.basename(rel),
                    "category": category,
                    "chunkIndex": i,
                    "content": chunk,
                    "chunkConfig": config,
                }
                f.write(json.dumps(row, ensure_ascii=False) + "\n")

    by_category = {}
    for r in doc_results:
        by_category.setdefault(r["category"], []).append(r["chunkCount"])
    summary = {
        "generated_at": datetime.now().astimezone().isoformat(timespec="seconds"),
        "documents": len(doc_results),
        "total_chunks": total_chunks,
        "by_category": {c: {"documents": len(v), "chunks": sum(v)}
                        for c, v in sorted(by_category.items())},
        "empty_documents": empty_docs,
    }
    # 报告与 chunks.jsonl 同目录（docs_import/）
    report_json = os.path.normpath(os.path.join(out_dir, os.path.basename(REPORT_JSON)))
    report_md = os.path.normpath(os.path.join(out_dir, os.path.basename(REPORT_MD)))
    with open(report_json, "w", encoding="utf-8") as f:
        json.dump({"summary": summary, "documents": doc_results}, f,
                  ensure_ascii=False, indent=2)
    write_md_report(summary, doc_results, report_md)

    print()
    print("===== D5 切片汇总 =====")
    print(f"{summary['documents']} 份文档 → {total_chunks} 片")
    for c, v in summary["by_category"].items():
        print(f"  {c}: {v['documents']} 份 / {v['chunks']} 片")
    print(f"[out] {os.path.abspath(args.out)}")
    print(f"[out] {report_json}")
    print(f"[out] {report_md}")

    if empty_docs:
        print()
        print("[ERROR] 以下文档切片为空（fail loud）：")
        for rel in empty_docs:
            print(f"  - {rel}")
        sys.exit(1)
    print()
    print("[OK] D5 验收通过：全部文档均有切片，报告可核对")


def write_md_report(summary, doc_results, path):
    lines = []
    a = lines.append
    a("# D5 切片报告")
    a("")
    a(f"- 生成时间：{summary['generated_at']}")
    a("- 生成脚本：`docs_import/chunk_docs.py`（算法照抄平台 `chunk.service.ts`）")
    a(f"- 文档数：{summary['documents']}，切片总数：{summary['total_chunks']}")
    a("")
    a("## 分类汇总")
    a("")
    a("| 分类 | 预设 | 文档数 | 切片数 |")
    a("|---|---|---|---|")
    for c, v in summary["by_category"].items():
        cfg = CATEGORY_CHUNK_PRESETS[c]
        preset = f"{cfg['strategy']} {cfg['chunkSize']}/{cfg['overlap']}"
        a(f"| {c} | {preset} | {v['documents']} | {v['chunks']} |")
    a("")
    a("## 逐文档明细")
    a("")
    a("| 文档 | 分类 | 切片数 |")
    a("|---|---|---|")
    for r in doc_results:
        a(f"| {r['documentName']} | {r['category']} | {r['chunkCount']} |")
    a("")
    a("## 验收说明")
    a("")
    a("- 任取 3 片人工检查：内容连贯、重叠部分确实重复上一片尾部（README D5 验收）。")
    with open(path, "w", encoding="utf-8") as f:
        f.write("\n".join(lines) + "\n")


if __name__ == "__main__":
    main()
