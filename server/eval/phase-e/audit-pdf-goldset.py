# -*- coding: utf-8 -*-
"""
M6 阶段 E：PDF 题库审计与金标准解析脚本（只读，不修改业务代码）。

输入：台风案例库_210道安全题库_去敏版.pdf
输出：
  - gold-set.v1.jsonl          解析后的金标准数据集（问题、标准答案、标注字段）
  - phase-e-precheck.json      题集预检报告（题数/分类/标签完整性/敏感扫描结果）

本脚本不打印、不写入任何敏感值；PDF 原文不提交。
"""
import hashlib
import json
import re
import sys
from pathlib import Path

import pdfplumber

PDF_PATH = Path(r"C:\Users\86182\Desktop\台风资料\台风资料\台风案例库_210道安全题库_去敏版.pdf")
OUT_DIR = Path(__file__).resolve().parent

SECTION_ORDER = [
    ("tool_routing", "第一部分 工具路由题"),
    ("kb", "第二部分 知识库题"),
    ("line_impact", "第三部分 线路影响题"),
    ("similar_case", "第四部分 相似案例题"),
    ("refusal", "第五部分 防编造 敏感拒答题"),
]
EXPECTED_COUNTS = {"tool_routing": 80, "kb": 50, "line_impact": 20, "similar_case": 30, "refusal": 30}

# ---------- 1. 提取文本 ----------
def extract_pdf_text(path: Path):
    pages = []
    with pdfplumber.open(path) as pdf:
        for page in pdf.pages:
            pages.append(page.extract_text() or "")
    return pages


def strip_furniture(pages):
    """去掉页眉、页脚、页码等排版噪声，返回纯文本行。"""
    lines = []
    for i, text in enumerate(pages, start=1):
        for ln in text.split("\n"):
            s = ln.strip()
            if not s:
                continue
            if s == "台风案例库训练与评测题库 · 去敏版":
                continue
            if re.fullmatch(r"第\d+页", s):
                continue
            lines.append(s)
    return lines


# ---------- 2. 切分章节与题目 ----------
QUESTION_RE = re.compile(r"^(\d{3})\.\s*(.*)$")


def split_sections(lines):
    """按五部分标题切分，返回 [(category, [lines...]), ...]。"""
    sections = []
    current = None
    for ln in lines:
        cat = None
        for c, prefix in SECTION_ORDER:
            if ln.startswith(prefix):
                cat = c
                break
        if cat:
            current = cat
            sections.append([cat, []])
        elif current is not None:
            sections[-1][1].append(ln)
    return sections


SKIP_PREFIXES = ("作答要求", "附录", "版式口径", "事实边界", "线路边界", "相似度边界", "拒答边界",
                 "使用说明", "安全说明", "答案格式", "风险口径", "来源与Chunk", "文档/集合",
                 "操作说明书", "研究报告", "四份台风信息表", "案例总览对照集", "本题库安全编制规范")


def parse_questions(section_lines):
    """把一节的文本行解析成题目列表。处理标准答案与标注跨行。"""
    questions = []
    cur = None
    for ln in section_lines:
        m = QUESTION_RE.match(ln)
        if m:
            if cur:
                questions.append(cur)
            cur = {"id": int(m.group(1)), "question": m.group(2).strip(), "answer": "",
                   "labels": {}, "_phase": "question", "_skip_all": False}
            continue
        if cur is None:
            continue
        if cur.get("_skip_all"):
            continue
        if ln.startswith("标准答案：") or ln.startswith("标准答案:"):
            cur["answer"] = ln.split("：", 1)[1] if "：" in ln else ln.split(":", 1)[1]
            cur["_phase"] = "answer"
        elif ln.startswith("标注｜"):
            cur["labels"] = parse_labels(ln[len("标注｜"):])
            cur["_phase"] = "label"
        elif ln.startswith(SKIP_PREFIXES):
            if ln.startswith("附录"):
                cur["_skip_all"] = True  # 章节尾部说明，忽略到下一题
        elif cur["_phase"] == "label" and cur["labels"]:
            # 标注跨行：接在最后一个标签值后面（如时间窗口折行）
            if ln.startswith("口："):
                cur["labels"]["timeWindow"] = cur["labels"].get("timeWindow", "") + ln[len("口："):]
            else:
                last_key = list(cur["labels"].keys())[-1]
                cur["labels"][last_key] = cur["labels"].get(last_key, "") + ln
        elif cur["_phase"] == "answer":
            cur["answer"] += ln
        else:
            cur["question"] += ln
    if cur:
        questions.append(cur)
    return questions


def parse_labels(s):
    """解析 标注｜文档：X｜Chunk：Y｜线路：Z｜风险等级：W｜时间窗口：V（兼容“时间窗”折行）"""
    labels = {}
    for part in s.split("｜"):
        part = part.strip()
        if not part:
            continue
        for key, prefix in [("doc", "文档："), ("chunk", "Chunk："), ("line", "线路："),
                            ("risk", "风险等级："), ("timeWindow", "时间窗口："),
                            ("timeWindow", "时间窗")]:
            if part.startswith(prefix):
                labels[key] = part[len(prefix):].strip()
                break
    return labels


# ---------- 3. 金标准字段派生（严格来自 PDF 标准答案，不新增事实） ----------
def derive_expected_tool(answer):
    """工具路由题：从标准答案提取“路由到X”。"""
    m = re.search(r"路由到[“\"]([^”\"]+)[”\"]", answer)
    if m:
        return m.group(1)
    m2 = re.search(r"路由到(.+?)(?:。|；|\.)", answer)
    if m2:
        return m2.group(1).strip()
    return None


def derive_refusal(answer):
    """防编造/敏感拒答题：判断是否应拒绝。"""
    refuse_markers = ["拒绝", "不能", "不应", "不得", "不猜测", "不可", "无法", "不允许", "不直接", "禁止"]
    for mk in refuse_markers:
        if mk in answer:
            return True
    return False


def normalize_risk(risk):
    if not risk:
        return None
    m = re.match(r"([RF]\d)", risk)
    if m:
        return m.group(1)
    m2 = re.match(r"(R\d)", risk)
    return m2.group(1) if m2 else risk.strip()


CASE_NAMES = ["灿都", "烟花", "轩岚诺", "贝碧嘉", "梅花"]
MEASURE_MARKERS = ["停运", "限速", "巡道", "交路调整", "间隔调整", "恢复运营", "提前结束运营"]


def canonicalize_window(w):
    """把 PDF 折行拼接的时间窗还原为规范格式（补空格），与出题脚本一致。"""
    if not w or w in ("—", "-"):
        return None
    s = w.strip()
    # 例: 2021-09-1306:00—2021-09-1411:00  → 2021-09-13 06:00—2021-09-14 11:00
    s = re.sub(r"(\d{4}-\d{2}-\d{2})(\d{2}:\d{2})", r"\1 \2", s)
    # 例: 2021-07-25 07:00—12:05 保持原样（省略年份的右端）
    return s


def extract_cases(answer, qid):
    """相似案例题：从标准答案提取案例名（按出现顺序去重）。"""
    if not (151 <= qid <= 180):
        return None
    found = [c for c in CASE_NAMES if c in answer]
    return found


def extract_measure(answer, qid):
    """线路影响题：从标准答案提取措施类型。"""
    if not (131 <= qid <= 150):
        return None
    for mk in MEASURE_MARKERS:
        if mk in answer:
            return mk
    return None


# ---------- 4. 敏感信息扫描 ----------
SENSITIVE_PATTERNS = {
    "phone": re.compile(r"1[3-9]\d{9}|(?<!\d)\d{3,4}[- ]?\d{7,8}(?!\d)"),
    "idcard": re.compile(r"\d{17}[\dXx]"),
    "ip": re.compile(r"\b(?:\d{1,3}\.){3}\d{1,3}\b"),
    "email": re.compile(r"[\w.+-]+@[\w-]+\.[\w.]+"),
    "jwt": re.compile(r"eyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}"),
    "token": re.compile(r"(?i)(api[_-]?key|token|secret|password|passwd|私钥|口令|凭据)\s*[:=]\s*\S+"),
    "admin_pwd": re.compile(r"(?i)(admin|root|superuser|超级管理员)\s*[:=]\s*\S+"),
}
SENSITIVE_CHECK_FIELDS = ["question", "answer", "labels"]


def scan_sensitive(questions):
    hits = []
    for q in questions:
        blob = q["question"] + "\n" + q["answer"] + "\n" + json.dumps(q["labels"], ensure_ascii=False)
        for name, pat in SENSITIVE_PATTERNS.items():
            if pat.search(blob):
                # 记录命中类型与题目 ID（不记录命中值本身）
                hits.append({"id": q["id"], "pattern": name})
    return hits


# ---------- 主流程 ----------
def main():
    pages = extract_pdf_text(PDF_PATH)
    sha256 = hashlib.sha256(PDF_PATH.read_bytes()).hexdigest().upper()
    lines = strip_furniture(pages)
    sections = split_sections(lines)

    # 章节标题行里的题数（例如 80 / 50 ...）本身也可能被 parse 当作普通行，这里不解析数字，
    # 而是用实际题目 ID 统计。

    all_questions = []
    section_summary = {}
    for cat, body in sections:
        qs = parse_questions(body)
        section_summary[cat] = {"parsed": len(qs), "ids": [q["id"] for q in qs]}
        all_questions.extend(qs)

    # 排序并按 ID 校验连续
    all_questions.sort(key=lambda q: q["id"])
    ids = [q["id"] for q in all_questions]
    id_continuous = ids == list(range(1, 211))

    # 标注完整性
    missing_labels = []
    for q in all_questions:
        if not q["answer"]:
            missing_labels.append({"id": q["id"], "missing": "answer"})
        for key in ("doc", "chunk"):
            if key not in q["labels"]:
                missing_labels.append({"id": q["id"], "missing": f"label:{key}"})

    # 派生字段
    for q in all_questions:
        q["expectedTool"] = derive_expected_tool(q["answer"])
        q["refusalExpected"] = derive_refusal(q["answer"]) if q["id"] >= 181 else None
        q["riskLevel"] = normalize_risk(q["labels"].get("risk"))
        if "risk" in q["labels"]:
            q["riskLevelRaw"] = q["labels"]["risk"]
        q["timeWindowCanonical"] = canonicalize_window(q["labels"].get("timeWindow"))
        q["expectedCases"] = extract_cases(q["answer"], q["id"])
        q["expectedMeasure"] = extract_measure(q["answer"], q["id"])
        q["expectedFacts"] = q["answer"]

    # 按类别的派生字段覆盖情况
    cat_derived = {}
    for cat, body in sections:
        ids_in_cat = section_summary[cat]["ids"]
        subset = [q for q in all_questions if q["id"] in ids_in_cat]
        if cat == "tool_routing":
            cat_derived[cat] = {"withTool": sum(1 for q in subset if q["expectedTool"])}
        elif cat == "kb":
            cat_derived[cat] = {"withChunk": sum(1 for q in subset if q["labels"].get("chunk"))}
        elif cat == "line_impact":
            cat_derived[cat] = {
                "withLine": sum(1 for q in subset if q["labels"].get("line")),
                "withTimeWindow": sum(1 for q in subset if q["labels"].get("timeWindow")),
                "withRisk": sum(1 for q in subset if q["labels"].get("risk")),
            }
        elif cat == "similar_case":
            cat_derived[cat] = {"withAnswer": sum(1 for q in subset if q["answer"])}
        elif cat == "refusal":
            cat_derived[cat] = {"refusalExpected": sum(1 for q in subset if q["refusalExpected"])}

    sensitive_hits = scan_sensitive(all_questions)

    precheck = {
        "pdf": {
            "filename": PDF_PATH.name,
            "sha256": sha256,
            "pages": len(pages),
            "sizeBytes": PDF_PATH.stat().st_size,
        },
        "totalQuestions": len(all_questions),
        "idContinuous": id_continuous,
        "firstId": ids[0] if ids else None,
        "lastId": ids[-1] if ids else None,
        "expectedCounts": EXPECTED_COUNTS,
        "sectionSummary": {k: {"count": v["parsed"], "expected": EXPECTED_COUNTS[k],
                               "ids": v["ids"]} for k, v in section_summary.items()},
        "countsMatch": all(section_summary[k]["parsed"] == EXPECTED_COUNTS[k] for k in EXPECTED_COUNTS),
        "missingLabels": missing_labels,
        "derivedCoverage": cat_derived,
        "sensitiveHits": sensitive_hits,
        "auditTime": __import__("datetime").datetime.now().isoformat(timespec="seconds"),
    }

    # 写预检报告
    (OUT_DIR / "phase-e-precheck.json").write_text(
        json.dumps(precheck, ensure_ascii=False, indent=2), encoding="utf-8")

    # 写金标准 jsonl（完整 schema；预检通过后即为冻结版 v1）
    with (OUT_DIR / "gold-set.v1.jsonl").open("w", encoding="utf-8") as f:
        for q in all_questions:
            rec = {
                "id": q["id"],
                "category": _cat_of(q["id"], section_summary),
                "question": q["question"],
                "answer": q["answer"],
                "expectedTool": q["expectedTool"],
                "expectedArguments": [],
                "expectedFacts": q["expectedFacts"],
                "expectedSources": {"doc": q["labels"].get("doc"), "chunk": q["labels"].get("chunk")},
                "expectedLines": [q["labels"]["line"]] if q["labels"].get("line") and q["labels"].get("line") != "—" else [],
                "expectedRiskLevel": q["riskLevel"],
                "expectedTimeWindow": q["timeWindowCanonical"],
                "expectedMeasure": q["expectedMeasure"],
                "expectedCases": q["expectedCases"],
                "refusalExpected": q["refusalExpected"],
                "notes": notes_for(q),
            }
            f.write(json.dumps(rec, ensure_ascii=False) + "\n")

    # 控制台摘要（不输出敏感值）
    print("=== 阶段E 题集预检摘要 ===")
    print(f"PDF: {PDF_PATH.name} | pages={len(pages)} | sha256={sha256}")
    print(f"总题数: {len(all_questions)} | 编号连续: {id_continuous} ({ids[0]}-{ids[-1]})")
    for k, v in section_summary.items():
        print(f"  {k}: {v['parsed']} (期望 {EXPECTED_COUNTS[k]})")
    print(f"分类数量匹配: {precheck['countsMatch']}")
    print(f"缺失标签条目数: {len(missing_labels)}")
    if missing_labels:
        for m in missing_labels[:20]:
            print(f"  MISSING {m}")
    print(f"敏感扫描命中条目数: {len(sensitive_hits)}")
    for h in sensitive_hits[:20]:
        print(f"  SENSITIVE id={h['id']} pattern={h['pattern']}")
    print(f"派生覆盖: {json.dumps(cat_derived, ensure_ascii=False)}")
    print(f"输出: {OUT_DIR / 'phase-e-precheck.json'} / {OUT_DIR / 'gold-set.v1.jsonl'}")


def _cat_of(qid, section_summary):
    for cat, v in section_summary.items():
        if qid in v["ids"]:
            return cat
    return "unknown"


def notes_for(q):
    """金标准派生说明（不新增事实，只记录派生口径）。"""
    notes = []
    if q["id"] <= 80:
        notes.append("金标准为案例库 UI 功能路由；平台 agent 工具集与其不同，见预检报告")
    if q["timeWindowCanonical"] and q["timeWindowCanonical"] != q["labels"].get("timeWindow"):
        notes.append("时间窗按出题脚本规范格式补空格还原")
    if q["id"] >= 181:
        notes.append("应拒答并给出安全替代方案")
    return notes


if __name__ == "__main__":
    sys.exit(main())
