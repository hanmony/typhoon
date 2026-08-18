# -*- coding: utf-8 -*-
"""
extract_docs.py — 步骤 D3：文本提取（PDF / docx / .doc / .xls → 纯文本）

功能
====
1. 读 docs_import/filter_manifest.json（D2 产出），只处理其中的 keep 清单与待定清单，
   **绝不自行遍历源数据目录**——敏感文件在 D2 已排除，本脚本碰不到它们。
2. keep 批次（60 份）：
   - PDF：pdfplumber 主提取（对双栏论文/公式更稳），失败或几乎为空时降级 PyPDF2 再试；
   - docx：python-docx（按文档顺序提取段落 + 表格，表格一行一单元格拼成一行）。
3. 待定批次（17 份，D2 标记待定）：
   - .doc 老格式：MS Word COM 主提取（中文保真度高，冒烟测试已验证）→ antiword 降级
     → 都不可用则跳过并在报告中列出（不阻塞整体进度）；
   - .xls 老格式：pandas + xlrd → 失败则跳过并列出；
   - 待定 docx（工作总结×3、梅花.docx）：与 keep 同法提取，但状态标 pending，供用户决策。
4. 疑似扫描件判定：PDF 提取字符数 < 200 或 < 30 字符/页 → 标记 suspect_scan（仍存 txt，
   D4/D5 可跳过或人工确认）。
5. 输出：
   - docs_import/text/  每份文档一个 .txt（UTF-8，目录结构镜像源目录）
   - docs_import/extract_metadata.json  逐份元数据（路径/大小/分类/提取方式/字数/页数/状态）
6. 验收兜底：keep 清单必须逐份得到 ok/suspect_scan 结果；任何一份 failed 则退出码 1。

用法
====
    python -X utf8 docs_import/extract_docs.py [manifest路径] [输出目录]
"""
import argparse
import json
import os
import re
import subprocess
import sys

# ──────────────────────────────────────────────────────────────────────
# 配置区
# ──────────────────────────────────────────────────────────────────────
HERE = os.path.dirname(os.path.abspath(__file__))
DEFAULT_MANIFEST = os.path.join(HERE, "filter_manifest.json")
DEFAULT_OUT = HERE

# 疑似扫描件判定阈值
SUSPECT_SCAN_MIN_CHARS = 200      # 全文不足 200 字符 → 疑似扫描件
SUSPECT_SCAN_MIN_PER_PAGE = 30    # 平均每页不足 30 字符 → 疑似扫描件
LOW_YIELD_MIN_CHARS = 5000        # ≥10 页文档不足 5000 字符 → 告警"字数偏少"
WATERMARK_MIN_REPEAT = 3          # 同一行出现 ≥3 次视为水印/页眉


# ──────────────────────────────────────────────────────────────────────
# 提取器实现
# ──────────────────────────────────────────────────────────────────────
def extract_pdf(path):
    """PDF：pdfplumber 主提取 → PyPDF2 降级。返回 (text, page_count, extractor)"""
    text, page_count, extractor = None, 0, "pdfplumber"
    try:
        import pdfplumber
        with pdfplumber.open(path) as pdf:
            page_count = len(pdf.pages)
            parts = []
            for page in pdf.pages:
                try:
                    parts.append(page.extract_text() or "")
                except Exception:
                    parts.append("")
            text = "\n".join(parts)
        # 主提取几乎为空 → 降级 PyPDF2（部分 PDF 结构 pdfplumber 解析不出）
        if len(text.strip()) < SUSPECT_SCAN_MIN_CHARS:
            extractor = "pdfplumber+PyPDF2"
            import PyPDF2
            reader = PyPDF2.PdfReader(path)
            page_count2 = len(reader.pages)
            text2 = "\n".join((pg.extract_text() or "") for pg in reader.pages)
            if len(text2.strip()) > len(text.strip()):
                text, page_count, extractor = text2, page_count2, "PyPDF2"
    except Exception as e:
        # pdfplumber 整体失败 → PyPDF2 降级
        try:
            import PyPDF2
            reader = PyPDF2.PdfReader(path)
            page_count = len(reader.pages)
            text = "\n".join((pg.extract_text() or "") for pg in reader.pages)
            extractor = "PyPDF2"
        except Exception as e2:
            return None, 0, None, f"pdfplumber失败({type(e).__name__}) / PyPDF2失败({type(e2).__name__})"
    return text, page_count, extractor, None


def effective_body_chars(text):
    """剔除反复出现的水印/页眉行后的正文字符数（水印行出现 ≥3 次才剔除）"""
    from collections import Counter
    lines = [l.strip() for l in text.splitlines() if l.strip()]
    if not lines:
        return 0
    most, freq = Counter(lines).most_common(1)[0]
    if freq >= WATERMARK_MIN_REPEAT:
        return max(0, len(text) - freq * len(most))
    return len(text)


def extract_docx(path):
    """docx：python-docx 按文档顺序提取段落 + 表格"""
    import docx
    doc = docx.Document(path)
    from docx.oxml.ns import qn
    lines = []
    for child in doc.element.body.iterchildren():
        tag = child.tag
        if tag == qn("w:p"):
            # 段落
            texts = child.itertext()
            line = "".join(texts).strip()
            if line:
                lines.append(line)
        elif tag == qn("w:tbl"):
            # 表格：一行一单元格拼成一行
            for row in child.iter(qn("w:tr")):
                cells = []
                for tc in row.iter(qn("w:tc")):
                    cells.append("".join(tc.itertext()).strip())
                cells = [c.replace("\n", " ").replace("|", "/") for c in cells]
                if any(cells):
                    lines.append(" | ".join(cells))
    return "\n".join(lines), None, "python-docx", None


def extract_doc_word_com(path):
    """老 .doc：MS Word COM（主）。返回 (text, extractor, error)"""
    import win32com.client
    word = None
    try:
        word = win32com.client.Dispatch("Word.Application")
        word.Visible = False
        word.DisplayAlerts = 0
        doc = word.Documents.Open(path, ReadOnly=True)
        try:
            text = doc.Content.Text
            text = text.replace("\r", "\n").replace("\x0b", "\n").replace("\x07", "\n")
        finally:
            doc.Close(False)
        return text, "word-com", None
    except Exception as e:
        return None, "word-com", f"Word COM 失败: {type(e).__name__} {str(e)[:120]}"
    finally:
        if word is not None:
            try:
                word.Quit()
            except Exception:
                pass


def extract_doc_antiword(path):
    """老 .doc：antiword CLI（降级，中文保真度有限）"""
    try:
        out = subprocess.run(
            ["antiword", path], capture_output=True, timeout=60)
        if out.returncode != 0:
            return None, f"antiword 退出码 {out.returncode}"
        # mingw 版 antiword 输出编码不确定，先试 GBK 再试 UTF-8
        for enc in ("gbk", "utf-8", "cp1252"):
            try:
                return out.stdout.decode(enc), None
            except UnicodeDecodeError:
                continue
        return out.stdout.decode("utf-8", errors="replace"), None
    except FileNotFoundError:
        return None, "antiword 不在 PATH 中"
    except Exception as e:
        return None, f"antiword 失败: {type(e).__name__} {str(e)[:120]}"


def extract_xls(path):
    """老 .xls：pandas + xlrd，所有 sheet 拼成文本"""
    import pandas as pd
    sheets = pd.read_excel(path, sheet_name=None, header=None)
    lines = []
    for name, df in sheets.items():
        lines.append(f"=== sheet: {name} ===")
        for _, row in df.iterrows():
            cells = ["" if pd.isna(v) else str(v).strip() for v in row.tolist()]
            if any(cells):
                lines.append(" | ".join(cells))
    return "\n".join(lines), None, "pandas+xlrd", None


# ──────────────────────────────────────────────────────────────────────
# 主流程
# ──────────────────────────────────────────────────────────────────────
def main():
    try:
        sys.stdout.reconfigure(encoding="utf-8", errors="replace")
    except Exception:
        pass
    # pdfminer 对个别 PDF 的配色警告刷屏，静音（不影响提取结果）
    import logging
    logging.getLogger("pdfminer").setLevel(logging.ERROR)

    ap = argparse.ArgumentParser(description="步骤 D3：文本提取（PDF/docx/.doc/.xls → 纯文本）")
    ap.add_argument("manifest", nargs="?", default=DEFAULT_MANIFEST,
                    help="D2 过滤清单 JSON 路径")
    ap.add_argument("out", nargs="?", default=DEFAULT_OUT, help="输出目录")
    args = ap.parse_args()

    with open(args.manifest, "r", encoding="utf-8") as f:
        manifest = json.load(f)
    root = manifest["source_root_innermost"]
    out_dir = os.path.abspath(args.out)
    text_dir = os.path.join(out_dir, "text")
    os.makedirs(text_dir, exist_ok=True)

    keep_items = manifest["keep"]
    pending_items = manifest["pending"]
    print(f"[extract] keep 批次 {len(keep_items)} 份 / 待定批次 {len(pending_items)} 份")
    print(f"[extract] 源根目录（只读）: {root}")

    documents = []
    pending_attempts = []

    def save_txt(relpath, text):
        dest = os.path.join(text_dir, os.path.splitext(relpath)[0] + ".txt")
        os.makedirs(os.path.dirname(dest), exist_ok=True)
        with open(dest, "w", encoding="utf-8") as f:
            f.write(text)
        return dest

    def process(relpath, size, category, is_pending):
        full = os.path.join(root, relpath)
        ext = os.path.splitext(relpath)[1].lower()
        entry = {
            "relpath": relpath,
            "size": size,
            "category": category,
            "extractor": None,
            "char_count": 0,
            "page_count": None,
            "status": None,
            "note": None,
        }
        text, err = None, None
        try:
            if ext == ".pdf":
                text, page_count, extractor, err = extract_pdf(full)
                entry["page_count"] = page_count
                entry["extractor"] = extractor
            elif ext == ".docx":
                text, _, extractor, err = extract_docx(full)
                entry["extractor"] = extractor
            elif ext == ".doc":
                text, extractor, err = extract_doc_word_com(full)
                if text is None:
                    alt_text, alt_err = extract_doc_antiword(full)
                    if alt_text is not None:
                        text, extractor, err = alt_text, "antiword", None
                        entry["note"] = "Word COM 失败，antiword 降级提取"
                    else:
                        err = f"{err}；antiword 降级也失败: {alt_err}"
                entry["extractor"] = extractor
            elif ext == ".xls":
                text, _, extractor, err = extract_xls(full)
                entry["extractor"] = extractor
            else:
                err = f"不支持的扩展名 {ext}"
        except Exception as e:
            err = f"{type(e).__name__}: {str(e)[:200]}"

        if text is None:
            entry["status"] = "skipped" if is_pending else "failed"
            entry["note"] = err or "提取失败"
            return entry

        # 保存 txt
        saved = save_txt(relpath, text)
        entry["char_count"] = len(text)

        # 状态判定
        if is_pending:
            entry["status"] = "pending_ok"
            entry["note"] = "待定批次已提取，待用户确认是否纳入知识库"
        else:
            entry["status"] = "ok"
            if ext == ".pdf" and entry["page_count"]:
                chars = entry["char_count"]
                body_chars = effective_body_chars(text)
                if chars < SUSPECT_SCAN_MIN_CHARS or \
                   chars < entry["page_count"] * SUSPECT_SCAN_MIN_PER_PAGE or \
                   body_chars < SUSPECT_SCAN_MIN_CHARS:
                    entry["status"] = "suspect_scan"
                    entry["note"] = (f"疑似扫描件：{chars} 字符 / {entry['page_count']} 页"
                                     f"（全文低于 {SUSPECT_SCAN_MIN_CHARS} 字符、"
                                     f"每页低于 {SUSPECT_SCAN_MIN_PER_PAGE} 字符、"
                                     f"或剔除重复水印后仅剩 {body_chars} 字符），"
                                     f"提取结果保留待人工确认")
                elif entry["page_count"] >= 10 and chars < LOW_YIELD_MIN_CHARS:
                    entry["note"] = (f"字数偏少：{chars} 字符 / {entry['page_count']} 页，"
                                     f"请人工抽查是否为正常提取")
        print(f"  [{entry['status']:>12}] {entry['char_count']:>7} 字  {relpath}")
        return entry

    # keep 批次
    failed_keep = 0
    for item in keep_items:
        e = process(item["relpath"], item["size"], item["category"], is_pending=False)
        if e["status"] == "failed":
            failed_keep += 1
        documents.append(e)

    # 待定批次
    for item in pending_items:
        e = process(item["relpath"], item["size"], "pending", is_pending=True)
        pending_attempts.append(e)
        if e["status"] == "skipped":
            print(f"  [SKIP] {e['note'][:80]}  {item['relpath']}")

    # 汇总
    status_count = {}
    for e in documents:
        status_count[e["status"]] = status_count.get(e["status"], 0) + 1
    pending_count = {}
    for e in pending_attempts:
        pending_count[e["status"]] = pending_count.get(e["status"], 0) + 1

    meta = {
        "generated": "2026-08-18",
        "step": "D3",
        "script": "docs_import/extract_docs.py",
        "manifest": os.path.abspath(args.manifest),
        "keep_total": len(keep_items),
        "pending_total": len(pending_items),
        "summary": {"keep": status_count, "pending": pending_count},
        "documents": documents,
        "pending_attempts": pending_attempts,
    }
    meta_path = os.path.join(out_dir, "extract_metadata.json")
    with open(meta_path, "w", encoding="utf-8") as f:
        json.dump(meta, f, ensure_ascii=False, indent=2)
    print(f"[out] {meta_path}")
    print(f"[out] 文本目录: {text_dir}")

    print("\n===== D3 提取汇总 =====")
    print(f"keep 批次 {len(keep_items)} 份: " +
          ", ".join(f"{k}={v}" for k, v in sorted(status_count.items())))
    print(f"待定批次 {len(pending_items)} 份: " +
          ", ".join(f"{k}={v}" for k, v in sorted(pending_count.items())))
    if status_count.get("suspect_scan"):
        print("\n[警告] 疑似扫描件（保留 txt 待人工确认）:")
        for e in documents:
            if e["status"] == "suspect_scan":
                print(f"  - {e['relpath']}  ({e['char_count']} 字 / {e['page_count']} 页)")
    if pending_count.get("skipped"):
        print("\n[提示] 待定批次跳过项（不阻塞整体进度）:")
        for e in pending_attempts:
            if e["status"] == "skipped":
                print(f"  - {e['relpath']}  ({e['note'][:80]})")

    if failed_keep:
        print(f"\n[ERROR] keep 批次有 {failed_keep} 份提取失败，验收不通过")
        for e in documents:
            if e["status"] == "failed":
                print(f"  - {e['relpath']}  ({e['note'][:100]})")
        sys.exit(1)
    print("\n[OK] keep 批次全部有提取结果（ok / suspect_scan），D3 验收通过")
    sys.exit(0)


if __name__ == "__main__":
    main()
