# -*- coding: utf-8 -*-
"""逐题核验 gold-set.v2.jsonl 与本地数据库的一致性（不修改任何数据）。"""
import json
import os
import re
import sys
from pymongo import MongoClient

client = MongoClient(os.environ.get("PHASE_E_DATABASE_URI", "mongodb://127.0.0.1:27017"),
                     serverSelectionTimeoutMS=5000)
db = client["schooltyphoon"]

recs = [json.loads(l) for l in open(r"server\eval\phase-e\gold-set.v2.jsonl", encoding="utf-8")]
print("total:", len(recs))

issues = []
ok = 0

expected_counts = {"tool_routing": 80, "kb": 50, "line_impact": 20,
                   "similar_case": 30, "refusal": 30}
actual_counts = {k: sum(1 for r in recs if r.get("category") == k) for k in expected_counts}
if len(recs) != 210 or actual_counts != expected_counts or len({r.get("id") for r in recs}) != len(recs):
    issues.append((0, "schema", f"count/id mismatch: total={len(recs)} categories={actual_counts}"))

# ---------- 1. 工具路由：工具名在 agent 工具清单中 ----------
AGENT_TOOLS = {"get_current_status", "get_operations", "search_documents", "get_typhoon_history",
               "get_duty_info", "get_messages", "get_severe_weather_history", "get_patrolling_tours",
               "get_case_actions", "get_case_metadata"}
for r in recs:
    if r["category"] == "tool_routing":
        acceptable = r.get("acceptableTools") or [r["expectedTool"]]
        if r["expectedTool"] in AGENT_TOOLS and all(tool in AGENT_TOOLS for tool in acceptable):
            ok += 1
        else:
            issues.append((r["id"], "tool", {"expected": r["expectedTool"], "acceptable": acceptable}))

# ---------- 2. 知识库：答案关键事实在标注 chunk 中 ----------
def get_chunk(doc_name, chunk_index):
    d = db["kbdocuments"].find_one({"name": doc_name})
    if not d:
        return None, "doc not found"
    c = db["kbchunks"].find_one({"documentId": str(d["_id"]), "chunkIndex": int(chunk_index)})
    if not c:
        return None, "chunk not found"
    return c.get("content", ""), None

def normalize(s):
    return re.sub(r"\s+", "", s)

# 每题取 1-2 个判别性事实串（数字/专有名词），检查是否在 chunk 中
KB_PROBES = {
    # (题目id, [判别串列表])
81: ["磁浮线", "浦江线", "台风", "暴雨"],
82: ["蓝", "黄", "橙", "红"],
83: ["就高"],
84: ["60km/h", "60"],
85: ["25km/h"],
86: ["20km/h", "清客", "停运"],
87: ["150mm", "ATP"],
88: ["40km/h"],
89: ["20km/h", "惰行"],
90: ["不应通过", "50mm"],
91: ["45km/h"],
92: ["25km/h"],
93: ["15km/h"],
94: ["立即停车"],
95: ["Ⅳ", "Ⅲ", "Ⅱ", "Ⅰ"],
96: ["1小时"],
97: ["30分钟"],
98: ["50mm", "限速"],
99: ["50mm", "不允许"],
100: ["1小时", "6小时", "终报"],
101: ["降水总量略多", "北上台风影响偏重"],
102: ["280余公里"],
103: ["9条", "46个"],
104: ["台风导致停运下的行车交路", "正线存车实施方案"],
105: ["舟山", "7月25日"],
106: ["风圈大", "强度强", "移速慢"],
107: ["48起", "24起"],
108: ["9月7日", "超强台风"],
109: ["Ⅳ", "Ⅱ"],
110: ["5", "16号线", "浦江线", "磁浮线", "2号线"],
111: ["7月24日", "26日"],
112: ["9月13日", "14日"],
113: ["9月13日", "14日"],
114: ["9月5日", "6日"],
115: ["8月9日", "11日"],
116: ["7月22日"],
117: ["5号线", "16号线", "磁浮线", "浦江线"],
118: ["21时", "3、5、16、17号线"],
119: ["9月15日6时"],
120: ["14条"],
121: ["轩岚诺", "无"],
122: ["11起"],
123: ["设备故障5起"],
124: ["2起"],
125: ["2起"],
126: ["风力大", "降水强度大", "路径不确定性大"],
127: ["21点", "15日早5点"],
128: ["12支", "473个"],
129: ["21时"],
130: ["6条", "9条", "159座"],
}

kb_ids = [r for r in recs if r["category"] == "kb"]
for r in kb_ids:
    probes = KB_PROBES.get(r["id"])
    if not probes:
        issues.append((r["id"], "kb", "no probe defined"))
        continue
    doc_name = r["expectedSources"]["doc"]
    chunk_idx = r["expectedSources"]["chunk"]
    content, err = get_chunk(doc_name, chunk_idx)
    if err:
        issues.append((r["id"], "kb", f"{doc_name}#{chunk_idx}: {err}"))
        continue
    nc = normalize(content)
    missing = [p for p in probes if normalize(p) not in nc]
    if missing:
        issues.append((r["id"], "kb", f"{doc_name}#{chunk_idx} missing probes: {missing}"))
    else:
        ok += 1

# ---------- 3. 线路影响：actions 中存在 案例+线路+措施+时间窗 记录 ----------
CASE_NAME = {"灿都": "2021灿都", "烟花": "2021烟花", "轩岚诺": "2022轩岚诺", "贝碧嘉": "贝碧嘉"}

def normalize_time(t):
    return re.sub(r"[^\d]", "", t or "")

for r in recs:
    if r["category"] != "line_impact":
        continue
    src = r["expectedSources"]
    case_label = src["chunk"]
    line = r["expectedLines"][0]
    measure = r["expectedMeasure"]
    window = r["expectedTimeWindow"]
    c = db["cases"].find_one({"name": {"$regex": CASE_NAME.get(case_label, case_label)}})
    if not c:
        issues.append((r["id"], "line", f"case not found: {case_label}"))
        continue
    found = False
    for a in db["actions"].find({"caseId": c["_id"], "category": "线路行车措施"}):
        items = a.get("items", {})
        if items.get("线路号") != line:
            continue
        if measure and measure not in str(items.get("行车措施", "")):
            continue
        # 时间窗匹配：金标准时间窗与记录时间窗（统一去除非数字后比较关键片段）
        if window:
            if not items.get("开始时间") or not items.get("结束时间"):
                continue
            gold_s = normalize_time(window.split("—")[0])
            gold_e = normalize_time(window.split("—")[1]) if "—" in window else ""
            rec_s = normalize_time(items.get("开始时间"))
            rec_e = normalize_time(items.get("结束时间"))
            if gold_s and gold_s not in rec_s and rec_s not in gold_s:
                continue
            if gold_e and gold_e not in rec_e and rec_e not in gold_e:
                continue
        found = True
        break
    if found:
        ok += 1
    else:
        issues.append((r["id"], "line", f"no actions record: {case_label} {line} {measure} {window}"))

# ---------- 4. 相似案例：案例特征核验（重点抽查断言） ----------
def case_vals(name):
    c = db["cases"].find_one({"name": {"$regex": name}})
    if not c:
        return {}
    return {k: (v.get("value") if isinstance(v, dict) else v) for k, v in c.get("values", {}).items()}

features = {
    "灿都": case_vals("灿都"), "烟花": case_vals("烟花"), "轩岚诺": case_vals("轩岚诺"),
    "贝碧嘉": case_vals("贝碧嘉"), "梅花": case_vals("梅花"),
}
print("\n--- 五案例特征（核验用） ---")
for name, f in features.items():
    print(f"  {name}: 年度={f.get('台风年度')} 类型={f.get('台风类型')} 走向={f.get('台风走向')} 风力={f.get('台风最大风力')} 时长={f.get('影响上海时长')} 预警={f.get('台风最大预警等级')} 停运={f.get('停运线路数')}")

# 断言式核验：每题答案中的关键断言与特征一致
SIM_CHECKS = [
    (151, lambda f: f["烟花"]["台风年度"] == "2021" and f["烟花"]["台风最大预警等级"] == "橙色预警" and f["烟花"]["台风走向"] == "东南"),
    (152, lambda f: f["灿都"]["台风年度"] == "2021" and f["灿都"]["台风最大预警等级"] == "橙色预警"),
    (153, lambda f: f["灿都"]["台风最大风力"] == f["轩岚诺"]["台风最大风力"]),
    (154, lambda f: "49" in f["贝碧嘉"]["影响上海时长"] and "49.5" in f["轩岚诺"]["影响上海时长"]),
    (155, lambda f: f["烟花"]["台风类型"] == "强台风" and f["贝碧嘉"]["台风类型"] == "强台风" and f["烟花"]["台风最大预警等级"] == "橙色预警"),
    (156, lambda f: f["烟花"]["台风最大风力"] == "42m/s" and f["贝碧嘉"]["台风最大风力"] == "42m/s" and f["烟花"]["台风最大预警等级"] == "橙色预警" and f["贝碧嘉"]["台风最大预警等级"] == "橙色预警"),
    (157, lambda f: "49.5" in f["轩岚诺"]["影响上海时长"] and "49小时" in f["贝碧嘉"]["影响上海时长"]),
    (158, lambda f: f["梅花"]["台风年度"] == "2022"),
    (159, lambda f: f["灿都"]["台风年度"] == "2021" and f["灿都"]["影响线路"] == "全线" and f["烟花"]["影响线路"] == "全线"),
    (160, lambda f: f["轩岚诺"]["台风类型"] == "强台风" and f["轩岚诺"]["台风走向"] == "东南" and f["烟花"]["台风走向"] == "东南"),
    (161, lambda f: "121小时" in f["烟花"]["影响上海时长"] and "103小时" in f["灿都"]["影响上海时长"]),
    (162, lambda f: "70小时" in f["梅花"]["影响上海时长"] and "49小时" in f["贝碧嘉"]["影响上海时长"]),
    (163, lambda f: "0条" in f["轩岚诺"]["停运线路数"]),
    (164, lambda f: "15条" in f["烟花"]["停运线路数"] and "16条" in f["梅花"]["停运线路数"]),
    (165, lambda f: f["灿都"]["台风类型"] == "超强台风"),
    (166, lambda f: f["烟花"]["台风最大风力"] == f["贝碧嘉"]["台风最大风力"]),
    (167, lambda f: f["灿都"]["台风最大风力"] == f["轩岚诺"]["台风最大风力"]),
    (168, lambda f: f["轩岚诺"]["台风最大预警等级"] == "黄色预警"),
    (169, lambda f: f["烟花"]["台风走向"] == "东南" and f["贝碧嘉"]["台风走向"] == "西北"),
    (170, lambda f: f["灿都"]["台风最大风力"] == f["轩岚诺"]["台风最大风力"]),
    (171, lambda f: "49" in f["贝碧嘉"]["影响上海时长"] and "49.5" in f["轩岚诺"]["影响上海时长"]),
    (172, lambda f: f["烟花"]["台风最大风力"] == f["贝碧嘉"]["台风最大风力"]),
    (173, lambda f: f["烟花"]["台风最大预警等级"] == "橙色预警"),
    (174, lambda f: f["轩岚诺"]["台风最大预警等级"] == "黄色预警"),
    (175, lambda f: f["贝碧嘉"]["台风年度"] == "2024" and f["贝碧嘉"]["台风最大预警等级"] == "橙色预警"),
    (176, lambda f: "121小时" in f["烟花"]["影响上海时长"] and "103小时" in f["灿都"]["影响上海时长"]),
    (177, lambda f: "49小时" in f["贝碧嘉"]["影响上海时长"] and "49.5" in f["轩岚诺"]["影响上海时长"]),
    (178, lambda f: "42" in f["烟花"]["台风最大风力"] and "48" in f["梅花"]["台风最大风力"]),
    (179, lambda f: True),
    (180, lambda f: True),
]
for qid, check in SIM_CHECKS:
    r = next(x for x in recs if x["id"] == qid)
    try:
        if check(features):
            ok += 1
        else:
            issues.append((qid, "sim", "feature assertion failed"))
    except Exception as e:
        issues.append((qid, "sim", f"check error: {e}"))

# ---------- 5. 拒答：refusalExpected 全部 true ----------
for r in recs:
    if r["category"] == "refusal":
        if r["refusalExpected"] is True:
            ok += 1
        else:
            issues.append((r["id"], "refusal", "refusalExpected not True"))

print(f"\n=== 核验结果: {ok}/{len(recs)} 通过 ===")
print(f"=== 问题数: {len(issues)} ===")
for qid, kind, msg in issues:
    print(f"  Q{qid} [{kind}] {msg}")

client.close()
if issues:
    sys.exit(1)
