#!/usr/bin/env python
# -*- coding: utf-8 -*-
"""clean_docs_text.py — 步骤 D4：文本清洗（去机器提取噪声，不改正文内容）

背景
====
D3 提取的 txt 混入了机器提取噪声，直接切片入库会污染检索（74 份普查结论）：
  - 页码行（"41 41 41 41"×83、"0 0 0 0"×816、"123"×14、"II"）
  - 期刊页眉（"Brought to you by ..."×22、"PLOS ONE ..."×21、"12h 24h ..."×7、
    "JID:AOSL ..."×5+（含空格变体）、"J o u r n a l o f W i n d ..."×14）
  - 公文页眉（文号行 "YXC/ZHZ-DT-JS/..."×12 及其相邻的裸页码）
  - PDF 字体映射失败的 (cid:N) 乱码（11 份学术 PDF 共 500+ 行）
  - 断行（中文公文句中被页面截断的碎行："…灾害性 / 海浪…"）

清洗只去"机器引入的噪声"，不改正文内容；每条规则、每份文件的数字全部写入
报告，方便逐条核对"为什么改"。

规则（与 README D4 一一对应，参数来自实测普查）
================================================
R1 行内清理：剔除 (cid:N) 乱码（含 ≥3 个且剩余可读字 <20 → 整行删）；
   中文相邻空格删除（"编 制 ，" → "编制，"）；全角数字字母→半角；连续空格压缩。
R2 页码行：纯数字+空格（≤16 字符）出现 ≥3 次 → 全删；纯罗马数字 ≥2 次 → 全删。
R3 近重复行：按规范化 key（去空白+小写）计数——
   - 短行（key ≤14 字符）≥3 次 → 留 1 次；
   - 长行（key ≥15 字符）≥5 次 → 留 1 次（页眉只留 1 行残迹，避免误删梅花快报
     这类每节重复的正文；编号列表项不参与，全部保留）；
   - 例外：中文/英文编号列表项（1、/（1）/a)/一、 等开头）不参与去重——
     不同章节场景下的同款条目是合法重复，删了会丢语境；
   - 与已删页眉相邻的裸页码行 → 一并删。
R4 断行合并：当前行尾无句末标点（。！？.!?;；：:）+ 下一行首字非大写字母/
   非数字/非（1）编号/非一、二、…标题 → 与下一行合并；
   - 行尾 "-" + 下一行小写开头 → 去连字符合并（英文单词断词）；
   - 例外：短行(≤20字) 后接 长行(≥40字) 视为"标题+正文"，不合并；
     表格行（含 " | "）与 "=== sheet" 行不参与合并。
R5 空行压缩：连续空行 → 1 行。
R6 参考文献保留：不删（README 明确要求，问答时可能引用）。

已知局限（写入报告）
====================
  - 英文双栏论文的左右栏交错行（同一条行内混有两栏碎片）不在本步修复，
    属 D3 提取层问题，留待后续评估按栏提取；
  - 页眉的截断变体（如 "H.Yuan,...xxx(xxxx)xx" 少一个 x）若出现 <5 次会残留。

输出
====
  docs_import/text_clean/      清洗后 txt（目录结构镜像 text/）
  docs_import/clean_report.json 逐份统计（供脚本/复核核对）
  docs_import/clean_report.md   人读报告（规则 + 数字 + 被删样例）

用法
====
  python -X utf8 docs_import/clean_docs_text.py [元数据json] [输入目录] [输出目录]

验收兜底
========
  任何一份输入 txt 清洗后为空 → 退出码 1（fail loud，防止静默丢内容）。
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
DEFAULT_IN = "docs_import/text"
DEFAULT_OUT = "docs_import/text_clean"
REPORT_JSON = "clean_report.json"
REPORT_MD = "clean_report.md"

CJK_CLASS = "一-鿿　-〿＀-￯"
CID_RE = re.compile(r"\(cid:\d+\)")
READABLE_RE = re.compile(r"[A-Za-z0-9一-鿿]")
SENSITIVE_PATH_RE = re.compile(
    r"身份证|值班表|值班安排|值班名单|联系方式|通讯录|联络表|联系人|联络员|负责人|手机号码|联系电话"
)
PAGE_NO_RE = re.compile(r"^[\d ]{1,16}$")        # 纯数字+空格（页码行）
ROMAN_RE = re.compile(r"^[ivxlIVXL]{1,6}$")      # 纯罗马数字（扉页页码）
# 编号列表项开头（不参与近重复去重，保留语境）
LIST_START_RE = re.compile(
    r"^(?:[（(]\d+[）)]|\d+[、]|[a-eA-E][）)]|[一二三四五六七八九十]+[、.])")
# 下一行若以此开头，则不向上合并（大写字母/数字/括号编号/中文序号标题）
NEXT_HEAD_RE = re.compile(
    r"^(?:[A-Z0-9]|[（(【\[]\d|[一二三四五六七八九十]+[、.])")
SENT_END = set("。！？.!?;；：:")
FULLWIDTH_MAP = str.maketrans(
    "０１２３４５６７８９ＡＢＣＤＥＦＧＨＩＪＫＬＭＮＯＰＱＲＳＴＵＶＷＸＹＺ"
    "ａｂｃｄｅｆｇｈｉｊｋｌｍｎｏｐｑｒｓｔｕｖｗｘｙｚ",
    "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz")
CJK_SPACE_RE = re.compile(
    "(?<=[%s])\\s+(?=[%s])" % (CJK_CLASS, CJK_CLASS))

SHORT_MAX = 14      # 短行 key 长度上限（近重复去重留 1）
LONG_MIN = 15       # 长行 key 长度下限（近重复留 1）
LONG_REPEAT = 5     # 长行重复阈值
SHORT_REPEAT = 3    # 短行重复阈值
CID_HEAVY = 3       # 单行 ≥3 个 (cid:N) 视为重度乱码行
CID_HEAVY_KEEP_READABLE = 20   # 重度乱码行剔除后剩余可读字 ≥20 则保留剩余部分
HEADING_GUARD_SHORT = 20       # 当前行 ≤20 字且下一行 ≥40 字 → 标题+正文不合并
HEADING_GUARD_LONG = 40
MERGE_CAP = 1000               # 合并结果长度上限（防止整页连成一行）


# ──────────────────────────────────────────────────────────────────────
# 工具函数
# ──────────────────────────────────────────────────────────────────────
def resolve_under(root, relpath):
    """解析相对路径，拒绝绝对路径或 ../ 越界（沿用 D3 加固逻辑）。"""
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
    """D3 输出 txt 的相对路径 = 源 relpath 去扩展名 + .txt"""
    return os.path.splitext(relpath)[0] + ".txt"


def norm_key(line):
    """近重复判定用 key：去全部空白 + 小写。"""
    return re.sub(r"\s+", "", line).lower()


def readable_len(line):
    return len(READABLE_RE.findall(line))


def is_cjk(ch):
    return ("一" <= ch <= "鿿" or "　" <= ch <= "〿"
            or "＀" <= ch <= "￯")


def join_sep(prev, nxt):
    """断行合并时的连接符：中文无缝、标点贴附、其余加空格。"""
    if not prev or not nxt:
        return ""
    p, n = prev[-1], nxt[0]
    if n in "，。、；：？！,.!?;:)]}）】」』\"'”’":
        return ""                       # 标点贴前
    if p in "（([{【「『\"'“‘":
        return ""                       # 开括号贴后
    if is_cjk(p) and is_cjk(n):
        return ""                       # 中文紧贴
    return " "


# ──────────────────────────────────────────────────────────────────────
# R1 行内清理
# ──────────────────────────────────────────────────────────────────────
def clean_line(line, stats):
    """返回 (cleaned, dropped)；dropped=True 表示整行判定为乱码删除。"""
    line = line.replace("\t", " ")
    line = re.sub(r"[\x00-\x08\x0b\x0c\x0e-\x1f\x7f]", "", line)
    cid_n = len(CID_RE.findall(line))
    if cid_n:
        stats["r1_cid_tokens"] += cid_n
        line = CID_RE.sub("", line)
    line = line.translate(FULLWIDTH_MAP)
    line = line.replace("　", " ")
    line = CJK_SPACE_RE.sub("", line)          # 中文相邻空格
    line = re.sub(r" {2,}", " ", line).strip()
    if not line.strip():
        return "", False
    if cid_n >= CID_HEAVY and readable_len(line) < CID_HEAVY_KEEP_READABLE:
        return "", True                        # 重度乱码行整行删
    if readable_len(line) == 0:
        return "", True                        # 纯符号行（如 "T T" 前的装饰线）删
    return line, False


# ──────────────────────────────────────────────────────────────────────
# R4 断行合并
# ──────────────────────────────────────────────────────────────────────
def should_merge(cur, nxt):
    """cur 与 nxt 是否合并（只判断边界条件，不含统计）。"""
    if not cur or not nxt:
        return False
    if cur.endswith("-") and nxt and nxt[0].islower() and nxt[0].isascii():
        return True                        # 英文断词连字符
    if cur[-1] in SENT_END:
        return False
    if NEXT_HEAD_RE.match(nxt):
        return False                       # 下一行是大写/数字/编号/标题
    if nxt.endswith("："):
        return False                       # 下一行是冒号结尾的标题
    if (" | " in cur or cur.startswith("===") or
            " | " in nxt or nxt.startswith("===")):
        return False                       # 表格行/sheet 行两侧均不合并
    if len(cur) <= HEADING_GUARD_SHORT and len(nxt) >= HEADING_GUARD_LONG:
        return False                       # 短标题 + 长正文
    return True


def merge_lines(lines):
    """对清理后的行序列做 R4 合并。返回 (merged, merge_count, samples)。"""
    out = []
    merge_count = 0
    samples = []
    for line in lines:
        if not out:
            out.append(line)
            continue
        cur = out[-1]
        if should_merge(cur, line):
            if cur.endswith("-") and line[0].islower() and line[0].isascii():
                combined = cur[:-1] + line    # 去掉断词连字符
            else:
                combined = cur + join_sep(cur, line) + line
            if len(combined) <= MERGE_CAP:
                out[-1] = combined
                merge_count += 1
                if len(samples) < 3:
                    samples.append(f"{cur[-30:]} ⏎ {line[:30]}")
            else:
                # 超长：拒绝本次合并，两行都原样保留，绝不截断正文。
                out.append(line)
        else:
            out.append(line)
    return out, merge_count, samples


# ──────────────────────────────────────────────────────────────────────
# 单文件清洗
# ──────────────────────────────────────────────────────────────────────
def clean_text(text):
    """完整清洗一个 txt，返回 (cleaned_text, stats)。"""
    stats = {"r1_cid_tokens": 0, "r1_dropped": 0, "r2_page": 0,
             "r3_dup_short": 0, "r3_dup_long": 0, "r2_adjacent": 0,
             "r4_merges": 0}
    removed_samples = {"R1": [], "R2": [], "R3短行": [], "R3长行": [],
                       "R2邻页眉": []}

    # R1
    cleaned = []
    for raw in text.splitlines():
        line, dropped = clean_line(raw.strip(), stats)
        if dropped:
            stats["r1_dropped"] += 1
            if len(removed_samples["R1"]) < 5:
                removed_samples["R1"].append(raw.strip()[:60])
            cleaned.append(None)
        else:
            cleaned.append(line)

    # 规范化 key 计数（R2/R3 共用）
    keys = {}
    reps = {}
    for i, line in enumerate(cleaned):
        if line is None:
            continue
        key = norm_key(line)
        if not key:
            continue                       # 空行交给 R5，不计入 R3 去重
        keys[key] = keys.get(key, 0) + 1
        if key not in reps:
            reps[key] = line

    page_keys = {k for k, n in keys.items() if n >= SHORT_REPEAT
                 and PAGE_NO_RE.match(k)}
    roman_keys = {k for k, n in keys.items() if n >= 2 and ROMAN_RE.match(k)}
    long_keys = {k for k, n in keys.items()
                 if n >= LONG_REPEAT and len(k) >= LONG_MIN}
    # 长行近重复：编号列表项保留全部（不同章节的同款条目是合法重复），
    # 其余（页眉等）留 1 次——梅花快报实测 "1、积水渗水…"×15 与
    # "请各单位…COCC1"×15 均为正文，全删会丢内容。
    long_keep1 = {k for k in long_keys if not LIST_START_RE.match(reps[k])}
    short_keys = set()
    for k, n in keys.items():
        if (n >= SHORT_REPEAT and len(k) <= SHORT_MAX
                and k not in page_keys and k not in roman_keys
                and k not in long_keys
                and not LIST_START_RE.match(reps[k])):
            short_keys.add(k)

    # R2 / R3 落标记
    pre_drop = list(cleaned)   # 删除前快照：R2 邻页眉检查要用原始相邻关系
    short_seen = set()
    long_seen = set()
    for i, line in enumerate(cleaned):
        if line is None:
            continue
        key = norm_key(line)
        if not key:
            continue                       # 空行交给 R5 压缩
        if key in page_keys or key in roman_keys:
            cleaned[i] = None
            stats["r2_page"] += 1
            if len(removed_samples["R2"]) < 5:
                removed_samples["R2"].append(line[:60])
        elif key in long_keep1:
            if key in long_seen:
                cleaned[i] = None
                stats["r3_dup_long"] += 1
                if len(removed_samples["R3长行"]) < 5:
                    removed_samples["R3长行"].append(line[:60])
            else:
                long_seen.add(key)
        elif key in short_keys:
            if key in short_seen:
                cleaned[i] = None
                stats["r3_dup_short"] += 1
                if len(removed_samples["R3短行"]) < 5:
                    removed_samples["R3短行"].append(line[:60])
            else:
                short_seen.add(key)

    # R2 邻页眉：与长页眉相邻的裸页码/罗马数字行一并删
    # 注意：相邻关系必须看删除前的原始序列（页眉行此刻已被标 None）
    for i, line in enumerate(cleaned):
        if line is None:
            continue
        if not (PAGE_NO_RE.match(line) or ROMAN_RE.match(line)):
            continue
        prev_key = next_key = None
        for j in range(i - 1, -1, -1):
            if pre_drop[j] is not None:
                prev_key = norm_key(pre_drop[j])
                break
        for j in range(i + 1, len(pre_drop)):
            if pre_drop[j] is not None:
                next_key = norm_key(pre_drop[j])
                break
        if prev_key in long_keep1 or next_key in long_keep1:
            cleaned[i] = None
            stats["r2_adjacent"] += 1
            if len(removed_samples["R2邻页眉"]) < 5:
                removed_samples["R2邻页眉"].append(line[:60])

    # R4 合并（跨已删行合并，页眉不再打断段落）
    kept = [l for l in cleaned if l is not None]
    merged, merge_count, merge_samples = merge_lines(kept)
    stats["r4_merges"] = merge_count

    # R5 空行压缩 + 首尾收口
    compressed = []
    for line in merged:
        if line == "" and compressed and compressed[-1] == "":
            continue
        compressed.append(line)
    while compressed and compressed[0] == "":
        compressed.pop(0)
    while compressed and compressed[-1] == "":
        compressed.pop()
    result = "\n".join(compressed)
    stats["removed_samples"] = removed_samples
    stats["merge_samples"] = merge_samples
    return result, stats


# ──────────────────────────────────────────────────────────────────────
# 主流程
# ──────────────────────────────────────────────────────────────────────
def main():
    try:
        sys.stdout.reconfigure(encoding="utf-8", errors="replace")
    except Exception:
        pass

    ap = argparse.ArgumentParser(description="步骤 D4：文本清洗（页眉页码/乱码/断行/近重复）")
    ap.add_argument("meta", nargs="?", default=DEFAULT_META,
                    help="D3 提取元数据 JSON 路径")
    ap.add_argument("in_dir", nargs="?", default=DEFAULT_IN,
                    help="D3 文本输出目录 docs_import/text")
    ap.add_argument("out_dir", nargs="?", default=DEFAULT_OUT,
                    help="清洗输出目录（默认 docs_import/text_clean）")
    args = ap.parse_args()

    with open(args.meta, "r", encoding="utf-8") as f:
        meta = json.load(f)
    documents = meta.get("documents")
    if not isinstance(documents, list) or not documents:
        print("[ERROR] 元数据缺少 documents 列表")
        sys.exit(1)
    ok_docs = [d for d in documents if d.get("status") in ("ok", "suspect_scan")]
    print(f"[D4] 元数据共 {len(documents)} 份，纳入清洗 {len(ok_docs)} 份"
          f"（status=ok/suspect_scan）")

    in_dir = os.path.realpath(os.path.abspath(args.in_dir))
    out_dir = os.path.realpath(os.path.abspath(args.out_dir))

    # 预检：txt 存在、路径约束、text/ 无清单外残留 txt（沿用 D3 加固思路）
    expected = {}
    expected_outputs = set()
    preflight_errors = []
    for d in ok_docs:
        rel = d.get("relpath")
        if isinstance(rel, str) and SENSITIVE_PATH_RE.search(rel):
            preflight_errors.append(f"元数据疑似包含敏感文件，拒绝读取: {rel}")
            continue
        try:
            txt_rel = text_relpath(rel)
            src = resolve_under(in_dir, txt_rel)
            dst = resolve_under(out_dir, txt_rel)
        except (TypeError, ValueError) as e:
            preflight_errors.append(str(e))
            continue
        if not os.path.isfile(src):
            preflight_errors.append(f"txt 不存在: {txt_rel}")
            continue
        dst_key = os.path.normcase(dst)
        if dst_key in expected_outputs:
            preflight_errors.append(f"输出路径冲突: {txt_rel}")
            continue
        expected[os.path.normcase(src)] = (rel, src, dst)
        expected_outputs.add(dst_key)
    for dirpath, _, filenames in os.walk(in_dir):
        for filename in filenames:
            if not filename.lower().endswith(".txt"):
                continue
            full = os.path.join(dirpath, filename)
            if os.path.normcase(full) not in expected:
                preflight_errors.append(
                    f"text/ 存在清单外残留 txt（先重跑 D3）: "
                    f"{os.path.relpath(full, in_dir)}")
    if preflight_errors:
        print(f"[ERROR] D4 预检失败（{len(preflight_errors)} 项）：")
        for message in preflight_errors:
            print(f"  - {message}")
        sys.exit(1)

    # 逐份清洗。只清除 text_clean/ 内不属于当前元数据的旧 txt，避免已排除
    # 扫描件被 D5 误收；其他文件一律不碰。
    os.makedirs(out_dir, exist_ok=True)
    stale_outputs = []
    for dirpath, _, filenames in os.walk(out_dir):
        for filename in filenames:
            if not filename.lower().endswith(".txt"):
                continue
            candidate = os.path.abspath(os.path.join(dirpath, filename))
            full = os.path.realpath(candidate)
            try:
                if os.path.commonpath([out_dir, full]) != out_dir:
                    print(f"[ERROR] 输出目录内存在越界链接，拒绝清理: {candidate}")
                    sys.exit(1)
            except ValueError:
                print(f"[ERROR] 输出目录内存在越界链接，拒绝清理: {candidate}")
                sys.exit(1)
            if os.path.normcase(full) not in expected_outputs:
                os.remove(candidate)
                stale_outputs.append(os.path.relpath(candidate, out_dir).replace(os.sep, "/"))
    file_results = []
    empty_outputs = []
    grand = {"files": 0, "lines_in": 0, "lines_out": 0, "chars_in": 0,
             "chars_out": 0, "r1_cid_tokens": 0, "r1_dropped": 0,
             "r2_page": 0, "r2_adjacent": 0, "r3_dup_short": 0,
             "r3_dup_long": 0, "r4_merges": 0,
             "stale_outputs_removed": len(stale_outputs)}
    for rel, src, dst in sorted(expected.values(), key=lambda x: x[0]):
        with open(src, "r", encoding="utf-8") as f:
            text = f.read()
        cleaned_text, stats = clean_text(text)
        if not cleaned_text.strip():
            empty_outputs.append(rel)
        os.makedirs(os.path.dirname(dst), exist_ok=True)
        with open(dst, "w", encoding="utf-8") as f:
            f.write(cleaned_text)
        lines_in = len([l for l in text.splitlines() if l.strip()])
        lines_out = len([l for l in cleaned_text.splitlines() if l.strip()])
        entry = {
            "relpath": rel,
            "chars_in": len(text),
            "chars_out": len(cleaned_text),
            "lines_in": lines_in,
            "lines_out": lines_out,
            "r1_cid_tokens": stats["r1_cid_tokens"],
            "r1_dropped": stats["r1_dropped"],
            "r2_page": stats["r2_page"],
            "r2_adjacent": stats["r2_adjacent"],
            "r3_dup_short": stats["r3_dup_short"],
            "r3_dup_long": stats["r3_dup_long"],
            "r4_merges": stats["r4_merges"],
            "removed_samples": stats["removed_samples"],
            "merge_samples": stats["merge_samples"],
        }
        file_results.append(entry)
        for k in ("r1_cid_tokens", "r1_dropped", "r2_page", "r2_adjacent",
                  "r3_dup_short", "r3_dup_long", "r4_merges"):
            grand[k] += entry[k]
        grand["files"] += 1
        grand["lines_in"] += lines_in
        grand["lines_out"] += lines_out
        grand["chars_in"] += len(text)
        grand["chars_out"] += len(cleaned_text)
        print(f"  {lines_in:>5}→{lines_out:>5} 行  "
              f"{len(text):>7}→{len(cleaned_text):>7} 字  {rel}")

    report = {
        "generated": datetime.now().astimezone().isoformat(timespec="seconds"),
        "step": "D4",
        "script": "docs_import/clean_docs_text.py",
        "metadata": os.path.abspath(args.meta),
        "input_dir": in_dir,
        "output_dir": out_dir,
        "summary": grand,
        "files": file_results,
    }
    report_json = os.path.join(os.path.dirname(out_dir), REPORT_JSON)
    with open(report_json, "w", encoding="utf-8") as f:
        json.dump(report, f, ensure_ascii=False, indent=2)
    write_md_report(report, os.path.join(os.path.dirname(out_dir), REPORT_MD))

    print("\n===== D4 清洗汇总 =====")
    s = grand
    print(f"{s['files']} 份：{s['lines_in']} 行 → {s['lines_out']} 行，"
          f"{s['chars_in']} 字 → {s['chars_out']} 字")
    print(f"R1 乱码: 剔 (cid) {s['r1_cid_tokens']} 处 / 整行删 {s['r1_dropped']}")
    print(f"R2 页码: {s['r2_page']} + 邻页眉 {s['r2_adjacent']}")
    print(f"R3 近重复: 短行 {s['r3_dup_short']} / 长行 {s['r3_dup_long']}")
    print(f"R4 断行合并: {s['r4_merges']} 处")
    print(f"清理清单外旧 txt: {s['stale_outputs_removed']} 份")
    print(f"[out] {report_json}")
    print(f"[out] {os.path.join(os.path.dirname(out_dir), REPORT_MD)}")
    print(f"[out] 清洗文本目录: {out_dir}")

    if empty_outputs:
        print(f"\n[ERROR] {len(empty_outputs)} 份清洗后为空（清洗规则误伤，需修规则）：")
        for rel in empty_outputs:
            print(f"  - {rel}")
        sys.exit(1)
    print("\n[OK] D4 验收通过：全部文件清洗后有内容，报告可核对")


def write_md_report(report, path):
    """人读清洗报告：规则 + 汇总 + 逐份表格 + 被删样例。"""
    s = report["summary"]
    lines = []
    a = lines.append
    a("# D4 文本清洗报告\n")
    a(f"- 生成时间：{report['generated']}")
    a(f"- 生成脚本：`docs_import/clean_docs_text.py`")
    a(f"- 输入目录：`{report['input_dir']}`")
    a(f"- 输出目录：`{report['output_dir']}`\n")
    a("## 规则速览\n")
    a("| 规则 | 动作 | 全量数字 |")
    a("|---|---|---:|")
    a(f"| R1 乱码 | 剔 (cid:N) 乱码；中文相邻空格删除；全角→半角 | 剔 {s['r1_cid_tokens']} 处 / 整行删 {s['r1_dropped']} |")
    a(f"| R2 页码 | 纯数字行≥3次、罗马数字≥2次、邻页眉页码 → 删 | {s['r2_page'] + s['r2_adjacent']} |")
    a(f"| R3 近重复 | 短行≥3次留1、长行≥5次留1（编号列表项保留） | {s['r3_dup_short'] + s['r3_dup_long']} |")
    a(f"| R4 断行 | 行尾无标点+下行非标题 → 合并 | {s['r4_merges']} 处 |")
    a("| R5 空行 | 连续空行压成 1 行 | — |")
    a("| R6 参考文献 | 保留不删 | — |\n")
    a(f"- 本次清理清单外旧 TXT：{s['stale_outputs_removed']} 份\n")
    a(f"## 汇总：{s['files']} 份，{s['lines_in']} 行 → {s['lines_out']} 行，"
      f"{s['chars_in']} 字 → {s['chars_out']} 字\n")
    a("## 逐份明细\n")
    a("| 文件 | 行 入→出 | 字 入→出 | R1乱码 | R2页码 | R3短 | R3长 | R4合并 |")
    a("|---|---:|---:|---:|---:|---:|---:|---:|")
    for f in report["files"]:
        a(f"| {f['relpath']} | {f['lines_in']}→{f['lines_out']} | "
          f"{f['chars_in']}→{f['chars_out']} | {f['r1_dropped']} | "
          f"{f['r2_page'] + f['r2_adjacent']} | {f['r3_dup_short']} | "
          f"{f['r3_dup_long']} | {f['r4_merges']} |")
    a("\n## 被删行样例（每类最多 10 条，供逐条核对）\n")
    for rule in ("R1", "R2", "R3短行", "R3长行", "R2邻页眉"):
        a(f"### {rule}\n")
        shown = 0
        for f in report["files"]:
            for sample in f["removed_samples"].get(rule, []):
                if shown >= 10:
                    break
                a(f"- `{sample}`  （{f['relpath']}）")
                shown += 1
            if shown >= 10:
                break
        if shown == 0:
            a("- （无）")
        a("")
    a("## 断行合并样例（每份最多 3 处）\n")
    for f in report["files"]:
        for sample in f["merge_samples"][:3]:
            a(f"- `{sample}`  （{f['relpath']}）")
    a("\n## 已知局限\n")
    a("- 英文双栏论文的左右栏交错行（同一行混有两栏碎片）不在本步修复，"
      "属 D3 提取层问题，留待后续评估按栏提取；")
    a("- 页眉截断变体（出现 <5 次）可能残留；")
    a("- 纯数字行若为表格数据且同值重复 ≥3 次会被当作页码删除——"
      "此类行对问答检索无价值，可接受。")
    with open(path, "w", encoding="utf-8") as f:
        f.write("\n".join(lines))


if __name__ == "__main__":
    main()
