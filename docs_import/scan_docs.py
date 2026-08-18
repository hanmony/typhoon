# -*- coding: utf-8 -*-
"""
scan_docs.py — 步骤 D2：文献与文档盘点（过滤清单生成器）

功能
====
1. 遍历「台风资料」数据根目录（自动下沉到最内层），把每个文件归入 8 类：
   keep_academic      学术论文 PDF → 平台分类 other
   keep_official      官方预案/规定/通知/指令/报告 → emergency_plan 或 regulation
   exclude_sensitive  敏感文件（身份证/值班表/联系方式）——不进库、不进 git
   exclude_scan       疑似扫描件（D3 实测无文字层，用户确认不保留）
   exclude_irrelevant 无关文件（开题答辩/会议纪要/系统建设文档/照片视频等）
   pending            待定（当前规则下为空——原 17 份已全部确认纳入）
   m4                 M4 线路空间研判材料（本阶段不处理）
   d0_excel           Excel 表格（D0 案例管线领域，文献管线不处理）
2. keep 列表按 SHA-256 内容去重（跨目录重名按内容识别，比「文件名+大小」更可靠，
   与 codex 对 clean_data.py 的审查结论一致）
3. 输出（docs_import/ 目录）：
   - filter_manifest.json  结构化清单（D3 extract_docs.py 直接读取）
   - 盘点清单.md            人类可读清单
4. 安全红线：敏感文件只记录 相对路径/大小/排除理由，绝不读取其内容
5. 兜底：任何未被规则覆盖的文件进入 unclassified，脚本以退出码 1 结束
   （宁可失败也不悄悄漏掉一份文件）

用法
====
    python -X utf8 docs_import/scan_docs.py [数据根目录] [输出目录]
"""
import argparse
import hashlib
import json
import os
import re
import sys

# ──────────────────────────────────────────────────────────────────────
# 配置区
# ──────────────────────────────────────────────────────────────────────
DEFAULT_ROOT = r"C:\Users\86182\AppData\Roaming\JetBrains\PyCharm2026.1\extensions\台风资料"
DEFAULT_OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)))

# 平台知识库分类（kb-document.schema.ts 的 category 枚举，只有 4 种，不能自创）
CAT_OTHER = "other"                    # 学术文献
CAT_EMERGENCY_PLAN = "emergency_plan"  # 预案/处置方案
CAT_REGULATION = "regulation"          # 规定/通知/指令/报告

# 规则表：按顺序匹配，命中即归类（前一条优先）
# 每条：kind 匹配方式（"name" 精确文件名 / "regex" 文件名正则 / "dir" 路径含目录片段 / "ext" 扩展名）
#       + 可选 path 限定（路径必须同时包含该片段）
RULES = [
    # ── 1. 敏感文件（红线，绝不读取内容） ──────────────────────────────
    dict(kind="name", name="领导身份证.pdf",
         bucket="exclude_sensitive", reason="身份证件——个人信息红线"),
    dict(kind="dir", path="梅花 - 副本/值班表",
         bucket="exclude_sensitive", reason="值班表——人员名单与排班信息"),
    dict(kind="name", name="台风梅花轨交支援人员联系方式.xlsx",
         bucket="exclude_sensitive", reason="轨交支援人员联系方式"),
    dict(kind="regex", pattern=r"^附件[1-6].*\.docx$", path="防汛防台基础数据",
         bucket="exclude_sensitive", reason="各单位负责人/联络员名单与应急联络表"),

    # ── 1.5 疑似扫描件（D3 实测无文字层，用户确认不保留） ─────────────
    # 2026-08-18 用户决策：如需 OCR 后重新纳入，删除本组规则并重跑本脚本即可
    dict(kind="name", name="附件：沪汛办〔2022〕40号+关于切实做好今年第11号台风“轩岚诺”防御工作的通知.pdf",
         bucket="exclude_scan",
         reason="疑似扫描件——D3 实测全文仅 2 字（无文字层），用户确认不保留"),
    dict(kind="name", name="《上海市防汛指挥部办公室关于认真贯彻落实习近平总书记重要指示精神进一步做好当前防汛救灾工作的通知》【沪汛办（2023）30号】.pdf",
         bucket="exclude_scan",
         reason="疑似扫描件——D3 实测全文仅 3 字（无文字层），用户确认不保留"),
    dict(kind="name", name="气候、分类和概率预测在成本损失率情况下的价值.pdf",
         bucket="exclude_scan",
         reason="疑似扫描件——D3 实测剔除重复水印后正文为空（14 页为图片），用户确认不保留"),

    # ── 2. M4 线路空间研判材料 ────────────────────────────────────────
    dict(kind="dir", path="上海市地铁线路和站点",
         bucket="m4", reason="地铁线路站点坐标——M4 线路空间研判用"),
    dict(kind="name", name="地铁坐标数据配置表.xlsx",
         bucket="m4", reason="地铁坐标数据——M4 用"),
    dict(kind="name", name="线路站名.xlsx",
         bucket="m4", reason="线路站名——M4 用"),
    dict(kind="name", name="地铁线路拾取坐标说明.docx",
         bucket="m4", reason="线路坐标拾取说明——M4 配套文档"),
    dict(kind="name", name="附件7上海轨道交通台风影响导致停运情况下的行车交路（2023年）.xlsx",
         bucket="m4", reason="停运行车交路表——M4 线路空间研判用"),

    # ── 3. 保留 A：学术文献 26 篇 ─────────────────────────────────────
    dict(kind="dir", path="文献", ext=".pdf",
         bucket="keep_academic", category=CAT_OTHER,
         reason="学术论文——台风路径预报/地铁洪水韧性/列车侧风稳定性等"),

    # ── 4. 保留 B：官方预案/规定/通知/指令 ────────────────────────────
    dict(kind="dir", path="防汛防台相关预案", ext=".pdf",
         bucket="keep_official", category="__by_name__",
         reason="官方专项预案/现场处置方案/管理规定"),
    dict(kind="dir", path="2023年防汛防台工作要求", ext=".pdf",
         bucket="keep_official", category=CAT_REGULATION,
         reason="上级防汛工作通知"),
    dict(kind="dir", path="防汛防台相关工作指令", ext=".pdf",
         bucket="keep_official", category=CAT_REGULATION,
         reason="防汛防台工作指令"),
    dict(kind="dir", path="防汛防台相关文件", ext=".pdf",
         bucket="keep_official", category=CAT_REGULATION,
         reason="防汛防台相关通知文件"),
    dict(kind="name", name="关于做好汛期大范围运营调整或停运期间的指标统计及报送工作的相关事宜.docx",
         bucket="keep_official", category=CAT_REGULATION,
         reason="汛期运营调整指标统计报送通知"),
    dict(kind="regex", pattern=r"^附件8.*\.docx$", path="防汛防台基础数据",
         bucket="keep_official", category=CAT_REGULATION,
         reason="台风天气正线存车实施方案"),
    dict(kind="regex", pattern=r"^附件9.*\.docx$", path="防汛防台基础数据",
         bucket="keep_official", category=CAT_REGULATION,
         reason="近年主要影响台风汇总表"),
    dict(kind="dir", path="台风案例基础数据", ext=".pdf",
         bucket="keep_official",
         category="__by_name__",  # 预案→emergency_plan，其余→regulation（见下）
         reason="官方应急预案/管理规定"),
    dict(kind="name", name="切实做好2022年第12号台风“梅花”防御工作.pdf",
         bucket="keep_official", category=CAT_REGULATION,
         reason="梅花防御工作通知"),
    dict(kind="name", name="加强台风“轩岚诺”影响期间轨道交通线网运营保障工作.docx",
         bucket="keep_official", category=CAT_REGULATION,
         reason="轩岚诺期间线网运营保障工作要求"),
    dict(kind="name", name="关于2022年第12号台风“梅花”防御工作情况的报告V2.docx",
         bucket="keep_official", category=CAT_REGULATION,
         reason="梅花防御工作情况报告"),
    dict(kind="name", name="台风事件汇总.docx",
         bucket="keep_official", category=CAT_REGULATION,
         reason="梅花期间台风事件汇总"),
    dict(kind="name", name="限速区段.docx",
         bucket="keep_official", category=CAT_REGULATION,
         reason="梅花期间限速区段安排"),
    dict(kind="name", name="历年台风影响事件.docx",
         bucket="keep_official", category=CAT_REGULATION,
         reason="历年台风影响事件汇总"),
    dict(kind="name", name="附件9近年主要影响台风汇总表（2018年至2022年）.docx",
         bucket="keep_official", category=CAT_REGULATION,
         reason="近年主要影响台风汇总表（与汇编附件9为同内容，按哈希去重）"),

    # ── 4.5 原待定 17 份（2026-08-18 用户决策：全部纳入） ─────────────
    dict(kind="ext", ext=".doc",
         bucket="keep_official", category=CAT_REGULATION,
         reason="梅花速报/停运预报/轩岚诺防御通知——D3 经 Word COM 提取成功，用户确认纳入"),
    dict(kind="regex", pattern=r"工作总结.*\.docx$",
         bucket="keep_official", category=CAT_REGULATION,
         reason="保障工作总结——D3 提取成功，用户确认纳入"),
    dict(kind="name", name="防汛防台相关规章及处置要求.xls",
         bucket="keep_official", category=CAT_REGULATION,
         reason="规章及处置要求——D3 经 pandas 提取成功，用户确认纳入"),
    dict(kind="name", name="梅花.docx",
         bucket="keep_official", category=CAT_REGULATION,
         reason="上海轨道交通防汛防台信息快报——D3 提取确认内容，用户确认纳入"),

    # ── 5. 无关文件 ───────────────────────────────────────────────────
    dict(kind="dir", path="开题",
         bucket="exclude_irrelevant", reason="开题报告/开题答辩（学生作业）与统计画图代码"),
    dict(kind="dir", path="会议纪要",
         bucket="exclude_irrelevant", reason="会议纪要——系统建设过程文档"),
    dict(kind="name", name="会议纪要模板.docx",
         bucket="exclude_irrelevant", reason="会议纪要模板"),
    dict(kind="name", name="论文正文cl初稿完整版.docx",
         bucket="exclude_irrelevant", reason="论文初稿——学生作业材料"),
    dict(kind="dir", path="数字化台风案例库系统软著申请材料",
         bucket="exclude_irrelevant", reason="软件著作权申请材料——开发材料"),
    dict(kind="dir", path="914公交接驳现场照片",
         bucket="exclude_irrelevant", reason="现场照片——知识库本轮只收文本"),
    dict(kind="dir", path="建设集团姚均",
         bucket="exclude_irrelevant", reason="现场材料目录——.doc 速报已归保留 B，其余现场材料排除"),
    dict(kind="ext", ext=".jpg",
         bucket="exclude_irrelevant", reason="现场照片——知识库本轮只收文本"),
    dict(kind="ext", ext=".png",
         bucket="exclude_irrelevant", reason="图片——知识库本轮只收文本"),
    dict(kind="ext", ext=".mp4",
         bucket="exclude_irrelevant", reason="现场视频——知识库本轮只收文本"),
    dict(kind="name", name="台风保障看板.pptx",
         bucket="exclude_irrelevant", reason="演示文稿——汇报材料"),
    dict(kind="name", name="2023防汛防台目录.docx",
         bucket="exclude_irrelevant", reason="汇编目录索引——非知识内容"),
    dict(kind="name", name="新建 文本文档 (2).txt",
         bucket="exclude_irrelevant", reason="数据清单说明——留作人工核对用"),
    dict(kind="name", name="2023年防汛汇编.zip",
         bucket="exclude_irrelevant", reason="压缩包副本——内容与「2023年防汛汇编」解压目录重复"),
    dict(kind="name", name="7.12调度台风案例系统功能梳理-改.docx",
         bucket="exclude_irrelevant", reason="系统功能梳理——系统建设文档"),
    dict(kind="name", name="7.1调度台风案例系统功能梳理-改.docx",
         bucket="exclude_irrelevant", reason="系统功能梳理——系统建设文档"),
    dict(kind="name", name="台风技术标.docx",
         bucket="exclude_irrelevant", reason="投标文档"),
    dict(kind="name", name="台风案例库源代码.docx",
         bucket="exclude_irrelevant", reason="源代码说明——开发文档"),
    dict(kind="name", name="台风案例库研究报告.docx",
         bucket="exclude_irrelevant", reason="系统建设研究报告"),
    dict(kind="name", name="台风案例库系统操作说明书.docx",
         bucket="exclude_irrelevant", reason="系统操作说明书——系统建设文档"),
    dict(kind="name", name="台风路径点坐标提取操作说明书.docx",
         bucket="exclude_irrelevant", reason="坐标提取操作说明——系统建设文档"),
    dict(kind="name", name="字段修改2023.12.11.docx",
         bucket="exclude_irrelevant", reason="字段修改记录——系统建设文档"),
    dict(kind="name", name="技术服务内容.docx",
         bucket="exclude_irrelevant", reason="投标/服务文档"),
    dict(kind="name", name="需求说明书-上海轨道交通台风案例库建设研究-09.25.docx",
         bucket="exclude_irrelevant", reason="系统需求说明书——系统建设文档"),
    dict(kind="name", name="防汛防台案例库总体需求.docx",
         bucket="exclude_irrelevant", reason="系统总体需求——系统建设文档"),
    dict(kind="name", name="台风二期测试.xlsx",
         bucket="exclude_irrelevant", reason="系统测试用例"),
    dict(kind="name", name="台风案例库字段.xlsx",
         bucket="exclude_irrelevant", reason="案例库字段设计文档"),
    dict(kind="name", name="台风案例库设计完成情况.xlsx",
         bucket="exclude_irrelevant", reason="项目进度表"),
    dict(kind="name", name="6.29台风事件字段.xlsx",
         bucket="exclude_irrelevant", reason="事件字段设计文档"),

    # ── 6. D0 案例管线领域（Excel 表格，文献管线不处理） ──────────────
    dict(kind="ext", ext=".xlsx",
         bucket="d0_excel", reason="Excel 表格——案例数据管线（D0）领域，已在 clean_data.py 处理范围"),
    dict(kind="ext", ext=".xls",
         bucket="d0_excel", reason="Excel 老格式表格——案例数据管线（D0）领域"),
]

# 预案类文件名关键词（用于 category="__by_name__" 的规则）
PLAN_KEYWORDS = ("预案", "处置方案")


# ──────────────────────────────────────────────────────────────────────
# 工具函数
# ──────────────────────────────────────────────────────────────────────
def sha256_of(path, chunk=1024 * 1024):
    """流式计算文件 SHA-256（敏感文件绝不调用本函数）"""
    h = hashlib.sha256()
    with open(path, "rb") as f:
        while True:
            block = f.read(chunk)
            if not block:
                break
            h.update(block)
    return h.hexdigest()


def find_innermost(root):
    """数据根目录有「台风资料/台风资料/台风资料」三层同名嵌套，自动下沉到最内层"""
    cur = os.path.abspath(root)
    while True:
        entries = os.listdir(cur)
        if len(entries) == 1 and os.path.isdir(os.path.join(cur, entries[0])):
            cur = os.path.join(cur, entries[0])
        else:
            return cur


def match_rule(relpath, fname, ext, rule):
    """判断一条规则是否命中；命中时返回归类结果，未命中返回 None"""
    kind = rule["kind"]
    if kind == "name":
        if fname != rule["name"]:
            return None
    elif kind == "regex":
        # 注意：文件名中「工作总结」等关键词不在开头，必须用 search 而非 match
        if not re.search(rule["pattern"], fname):
            return None
    elif kind == "dir":
        if rule["path"] not in relpath:
            return None
    elif kind == "ext":
        if ext != rule["ext"]:
            return None
    else:
        raise ValueError(f"未知规则类型: {kind}")
    if "path" in rule and rule["path"] not in relpath:
        return None
    if "ext" in rule and ext != rule["ext"]:
        return None

    result = {
        "bucket": rule["bucket"],
        "reason": rule.get("reason", ""),
    }
    category = rule.get("category")
    if category == "__by_name__":
        category = (CAT_EMERGENCY_PLAN if any(k in fname for k in PLAN_KEYWORDS)
                    else CAT_REGULATION)
    if category:
        result["category"] = category
    return result


def classify(relpath, ext, fname):
    """按规则表顺序归类；未命中任何规则返回 (None, None)"""
    for rule in RULES:
        hit = match_rule(relpath, fname, ext, rule)
        if hit is not None:
            return hit["bucket"], hit
    return None, None


# ──────────────────────────────────────────────────────────────────────
# 主流程
# ──────────────────────────────────────────────────────────────────────
def main():
    try:
        sys.stdout.reconfigure(encoding="utf-8", errors="replace")
    except Exception:
        pass

    ap = argparse.ArgumentParser(description="步骤 D2：文献与文档盘点（过滤清单生成器）")
    ap.add_argument("root", nargs="?", default=DEFAULT_ROOT, help="数据根目录")
    ap.add_argument("out", nargs="?", default=DEFAULT_OUT, help="输出目录")
    args = ap.parse_args()

    root = find_innermost(args.root)
    out_dir = os.path.abspath(args.out)
    os.makedirs(out_dir, exist_ok=True)
    print(f"[scan] 数据根目录（最内层）: {root}")

    buckets = {  # bucket -> [ {relpath, size, ...} ]
        "keep_academic": [],
        "keep_official": [],
        "exclude_sensitive": [],
        "exclude_scan": [],
        "exclude_irrelevant": [],
        "pending": [],
        "m4": [],
        "d0_excel": [],
        "unclassified": [],
    }

    # 1) 遍历归类（全部文件都进清单，不剪枝）
    for dirpath, dirnames, filenames in os.walk(root):
        for fname in sorted(filenames):
            full = os.path.join(dirpath, fname)
            rel = os.path.relpath(full, root).replace(os.sep, "/")
            ext = os.path.splitext(fname)[1].lower()
            bucket, info = classify(rel, ext, fname)
            if bucket is None:
                bucket = "unclassified"
                info = {"reason": "未命中任何规则——需要人工补规则"}
            entry = {
                "relpath": rel,
                "size": os.path.getsize(full),
                "reason": info.get("reason", ""),
            }
            # 敏感文件绝不读取内容；其余 keep 类文件计算哈希用于去重
            if bucket != "exclude_sensitive":
                entry["sha256"] = sha256_of(full)
            if "category" in info:
                entry["category"] = info["category"]
            buckets[bucket].append(entry)

    # 2) keep 列表按 SHA-256 去重（跨目录重名按内容识别）
    seen = {}
    duplicates = []
    keep_all = []
    for bucket_key in ("keep_academic", "keep_official"):
        for entry in buckets[bucket_key]:
            h = entry["sha256"]
            if h in seen:
                duplicates.append({
                    "relpath": entry["relpath"],
                    "size": entry["size"],
                    "sha256": h,
                    "kept_as": seen[h],
                })
            else:
                seen[h] = entry["relpath"]
                keep_all.append((bucket_key, entry))
    buckets["keep_academic"] = [e for b, e in keep_all if b == "keep_academic"]
    buckets["keep_official"] = [e for b, e in keep_all if b == "keep_official"]

    # 3) 输出 manifest
    manifest = {
        "generated": "2026-08-18",
        "script": "docs_import/scan_docs.py",
        "step": "D2",
        "source_root": os.path.abspath(args.root),
        "source_root_innermost": root,
        "category_enum": ["typhoon_case", "regulation", "emergency_plan", "other"],
        "summary": {**{k: len(v) for k, v in buckets.items()},
                    "duplicates": len(duplicates)},
        "keep": [
            {"relpath": e["relpath"], "size": e["size"],
             "sha256": e["sha256"], "category": e.get("category", CAT_OTHER)}
            for e in (buckets["keep_academic"] + buckets["keep_official"])
        ],
        "exclude": [
            {"relpath": e["relpath"], "size": e["size"],
             "scope": "sensitive", "reason": e["reason"]}
            for e in buckets["exclude_sensitive"]
        ] + [
            {"relpath": e["relpath"], "size": e["size"],
             "scope": "scan", "reason": e["reason"]}
            for e in buckets["exclude_scan"]
        ] + [
            {"relpath": e["relpath"], "size": e["size"],
             "scope": "irrelevant", "reason": e["reason"]}
            for e in buckets["exclude_irrelevant"]
        ],
        "pending": [
            {"relpath": e["relpath"], "size": e["size"], "reason": e["reason"]}
            for e in buckets["pending"]
        ],
        "m4": [
            {"relpath": e["relpath"], "size": e["size"], "reason": e["reason"]}
            for e in buckets["m4"]
        ],
        "d0_excel": [
            {"relpath": e["relpath"], "size": e["size"], "reason": e["reason"]}
            for e in buckets["d0_excel"]
        ],
        "duplicates": duplicates,
        "unclassified": buckets["unclassified"],
    }
    manifest_path = os.path.join(out_dir, "filter_manifest.json")
    with open(manifest_path, "w", encoding="utf-8") as f:
        json.dump(manifest, f, ensure_ascii=False, indent=2)
    print(f"[out] {manifest_path}")

    # 4) 人类可读清单
    md_path = os.path.join(out_dir, "盘点清单.md")
    with open(md_path, "w", encoding="utf-8") as f:
        f.write("# 步骤 D2：文献与文档盘点清单\n\n")
        f.write(f"- 生成时间：{manifest['generated']}\n")
        f.write(f"- 数据根目录（最内层）：`{root}`\n")
        f.write(f"- 生成脚本：`docs_import/scan_docs.py`\n\n")
        s = manifest["summary"]
        f.write("## 汇总\n\n")
        f.write(f"| 类别 | 数量 |\n|---|---:|\n")
        for label, key in [
            ("保留 A——学术文献（other）", "keep_academic"),
            ("保留 B——官方文档（emergency_plan / regulation）", "keep_official"),
            ("排除——敏感（不进库不进 git）", "exclude_sensitive"),
            ("排除——疑似扫描件（用户确认不保留）", "exclude_scan"),
            ("排除——无关", "exclude_irrelevant"),
            ("待定", "pending"),
            ("M4 线路空间研判材料", "m4"),
            ("D0 案例管线领域（Excel）", "d0_excel"),
            ("重复（按 SHA-256 去重）", "duplicates"),
            ("未归类（需补规则）", "unclassified"),
        ]:
            f.write(f"| {label} | {s[key]} |\n")
        f.write("\n")

        def write_table(title, entries, cols):
            f.write(f"## {title}\n\n")
            if not entries:
                f.write("（空）\n\n")
                return
            f.write("| " + " | ".join(cols) + " |\n")
            f.write("|" + "---|" * len(cols) + "\n")
            for e in entries:
                f.write("| " + " | ".join(str(e.get(c, "")) for c in cols) + " |\n")
            f.write("\n")

        write_table("保留 A：学术文献（平台分类 other）", buckets["keep_academic"],
                    ["relpath", "size"])
        write_table("保留 B：官方文档（emergency_plan / regulation）", buckets["keep_official"],
                    ["relpath", "category", "size"])
        write_table("排除：敏感文件（绝不进库、绝不进 git）", buckets["exclude_sensitive"],
                    ["relpath", "size", "reason"])
        write_table("排除：疑似扫描件（D3 实测无文字层，用户确认不保留）", buckets["exclude_scan"],
                    ["relpath", "size", "reason"])
        write_table("排除：无关文件", buckets["exclude_irrelevant"],
                    ["relpath", "size", "reason"])
        write_table("待定", buckets["pending"],
                    ["relpath", "size", "reason"])
        write_table("M4 线路空间研判材料（本阶段不处理）", buckets["m4"],
                    ["relpath", "size", "reason"])
        write_table("D0 案例管线领域（clean_data.py 处理范围，文献管线不处理）",
                    buckets["d0_excel"], ["relpath", "size", "reason"])
        write_table("跨目录重复（按 SHA-256 去重，仅保留首份）", duplicates,
                    ["relpath", "kept_as", "size"])
        write_table("未归类（需人工补规则）", buckets["unclassified"],
                    ["relpath", "size"])
    print(f"[out] {md_path}")

    # 5) 汇总打印
    s = manifest["summary"]
    print("\n===== D2 盘点汇总 =====")
    print(f"保留 A 学术文献 : {s['keep_academic']}")
    print(f"保留 B 官方文档 : {s['keep_official']}")
    print(f"排除 敏感       : {s['exclude_sensitive']}")
    print(f"排除 扫描件     : {s['exclude_scan']}")
    print(f"排除 无关       : {s['exclude_irrelevant']}")
    print(f"待定            : {s['pending']}")
    print(f"M4 材料         : {s['m4']}")
    print(f"D0 Excel        : {s['d0_excel']}")
    print(f"去重掉          : {len(duplicates)}")
    print(f"未归类          : {s['unclassified']}")

    if buckets["unclassified"]:
        print("\n[ERROR] 存在未归类文件，请补规则后重跑：")
        for e in buckets["unclassified"]:
            print(f"  - {e['relpath']}")
        sys.exit(1)
    print("[OK] 盘点完成，全部文件均已归类")
    sys.exit(0)


if __name__ == "__main__":
    main()
