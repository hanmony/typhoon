# -*- coding: utf-8 -*-
"""
import_cases_to_mongo.py — 台风案例数据导入 MongoDB（README 步骤 D1，独立脚本，不依赖项目代码）

功能
====
把 clean_data.py 的清洗产物（clean_output/{cases,tracks}.json）写入平台库 schooltyphoon 的
三个集合（绝不碰其他集合）：

- cases       案例文档：name = 总览「台风命名」值；values = 总览配置项（key/type/value/editorType/editorOptions，
              对齐仓库 CaseConfigItem）；status = 0（normal，案例库页可见）
- actions     案例事件：caseId = 案例文档 _id；caseName = 案例名；category 对齐仓库 ActionCategory；
              fromDate/toDate 对齐 ExcelBaseDto（空结束时间 → 3000 年，表示无结束时间）；
              items 用中文列名（前端事件详情页按中文键读取，这里按类别做英→中反向映射）
- pathinfos   台风路径点：caseId = 案例名（前端 getPathInfos 按 name 查，平台 importer 同款语义）；
              power 拼回「18米/秒,8级」格式（前端 getPower 正则要求）；
              radius 统一为「七级：东北x 东南x 西南x 西北x；十级：…；十二级：…」
              （前端 formatRadius 正则要求；JSON 路径源的 4 段管道值按 东北|东南|西南|西北 顺序展开）

幂等
====
每个案例导入前：先删同名案例旧文档（cases.name）+ 其 actions（按旧 _id），
再删同 caseId 旧路径点，最后插入。重复执行结果不变。

跳过与告警
==========
- 「舆情及敏感信息」不在仓库 ActionCategory 枚举中（平台 CaseImportService 也不导入该 sheet），
  且其内容（热线接听总量等）已存在于案例总览 values 中 → 跳过并记入报告；
- 未在映射表中的英文字段、非法日期/经纬度等 → 告警记入报告。

用法
====
    python import_cases_to_mongo.py [--uri mongodb://127.0.0.1:27017/schooltyphoon] [--input clean_output] [--report import_report.json]

依赖
====
    pip install pymongo
"""
import argparse
import json
import os
import re
import sys
from datetime import datetime

try:
    from pymongo import MongoClient
except ImportError:
    sys.exit("缺少 pymongo，请先安装：pip install pymongo")

# ──────────────────────────────────────────────────────────────────────
# 配置区
# ──────────────────────────────────────────────────────────────────────
HERE = os.path.dirname(os.path.abspath(__file__))
DEFAULT_INPUT = os.path.join(HERE, "clean_output")
DEFAULT_URI = os.environ.get("DATABASE_URI") or "mongodb://127.0.0.1:27017/schooltyphoon"
DEFAULT_REPORT = os.path.join(HERE, "clean_output", "import_report.json")

NO_END = datetime(3000, 1, 1)  # 空结束时间 = 无结束时间（对齐平台 ExcelBaseDto）

# 仓库 ActionCategory 认可的 11 类事件（对齐 case.import.service.ts 的 importers 列表）
ACTION_CATEGORIES = [
    "重点事件表",
    "天气预警发布",
    "预警发布及响应",
    "路网指令措施",
    "线路行车措施",
    "受台风影响运营事件",
    "施工调整",
    "客运措施",
    "客运处置",
    "信息报告",
    "媒体宣传",
]

# 不在 ActionCategory 枚举中的 sheet（内容已进总览 values，跳过）
SKIP_CATEGORIES = {"舆情及敏感信息": "不在 ActionCategory 枚举，内容已存在于案例总览 values"}

# 事件 items 的中文列名（前端 case-detail 页按中文键读取 items）。
# 同一英文列在不同来源 sheet 的中文名不同（如 key_points：工作要点/主要内容），
# 统一取前端模板实际读取的那个（notification-template / typhoon-detail-modal）。
ITEM_KEY_MAP = {
    "预警发布及响应": {
        "start_time": "开始时间", "end_time": "结束时间",
        "warning_kind": "预警种类", "warning_release": "预警发布", "warning_response": "预警响应",
        "duty_post": "响应岗位", "duty_count": "响应人数", "tip": "重点提示",
    },
    "路网指令措施": {
        "start_time": "开始时间", "end_time": "结束时间",
        "publisher": "发布单位/部门", "category": "种类", "instruction": "工作指令",
        "key_points": "工作要点", "content": "内容", "tip": "重点提示",
    },
    "线路行车措施": {
        "start_time": "开始时间", "end_time": "结束时间",
        "line": "线路号", "from_station": "起始车站", "to_station": "终止车站",
        "direction": "上下行", "turnback": "存车线、折返线", "measure": "行车措施",
        "remark": "备注", "section": "区段", "tip": "重点提示",
    },
    "受台风影响运营事件": {
        "start_time": "开始时间", "end_time": "结束时间",
        "line": "线路号", "kind": "类型", "station": "车站",
        "from_station": "区间起始车站", "to_station": "区间终止车站",
        "direction": "上下行", "turnback": "存车线、折返线", "base": "基地/控制中心",
        "event_type": "事件类型", "detail": "事件详情", "key_points": "主要措施",
        "location": "地点", "content": "内容", "seq": "序号", "tip": "重点提示",
    },
    "施工调整": {
        "start_time": "开始时间", "end_time": "结束时间",
        "line": "线路", "work_count": "施工数量", "adjust_measure": "调整措施", "tip": "重点提示",
    },
    "客运措施": {
        "start_time": "开始时间", "end_time": "结束时间",
        "line": "线路号", "from_station": "起始车站", "to_station": "终止车站",
        "measure": "措施", "remark": "备注", "location": "地点", "tip": "重点提示",
    },
    "客运处置": {
        "start_time": "开始时间", "end_time": "结束时间",
        "line": "线路号", "station": "车站", "kind": "类型", "detail": "事件详情", "tip": "重点提示",
    },
    "信息报告": {
        "start_time": "开始时间", "end_time": "结束时间",
        "category": "种类", "report_scope": "报送范围", "content": "内容", "tip": "重点提示",
    },
    "媒体宣传": {
        "start_time": "开始时间", "end_time": "结束时间",
        "publish_way": "发布方式", "content": "内容",
        "read_count": "阅读量", "comment_count": "评论数", "tip": "重点提示",
    },
    "天气预警发布": {
        "start_time": "开始时间", "end_time": "结束时间",
        "content": "内容", "kind": "类型", "level": "等级", "warning_content": "预警内容",
        "tip": "重点提示",
    },
    "重点事件表": {
        "start_time": "开始时间", "end_time": "结束时间",
        "line": "线路号", "from_station": "起始车站", "to_station": "终止车站",
    },
}

# 风圈 4 段管道值的方位顺序（对齐传统路径文件的「东北/东南/西南/西北」写法）
RADIUS_DIRS = ["东北", "东南", "西南", "西北"]
RADIUS_KEYS = [("七级", "radius"), ("十级", "radius10"), ("十二级", "radius12")]


# ──────────────────────────────────────────────────────────────────────
# 工具函数
# ──────────────────────────────────────────────────────────────────────
class Reporter:
    """收集告警并聚合计数，最后写 JSON 报告"""

    def __init__(self):
        self.warnings = []
        self.skipped = []
        self.cases = []
        self.paths = []

    def warn(self, category, message):
        self.warnings.append({"category": category, "message": message})

    def skip(self, category, message):
        self.skipped.append({"category": category, "message": message})


REPORTER = None  # 全局报告器，main 里初始化；工具函数通过 warn() 上报


def warn(category, message):
    if REPORTER is not None:
        REPORTER.warn(category, message)


def parse_dt(text, where):
    """'2022-09-08 08:00:00' / '2022-09-08' → datetime；空串返回 None"""
    if text is None or str(text).strip() == "":
        return None
    for fmt in ("%Y-%m-%d %H:%M:%S", "%Y-%m-%d"):
        try:
            return datetime.strptime(str(text).strip(), fmt)
        except ValueError:
            continue
    warn(where, f"无法解析日期「{text}」")
    return None


_TIME_RE = re.compile(r"(\d{1,2})[时:：](\d{2})?")


def parse_action_time(text, year, anchor, where, which="first"):
    """事件起止时间解析（尽力而为，近似结果一律告警，便于报告核对）。

    支持源码中出现的自由文本：
    - 完整 ISO（精确）；
    - 「2022-09-14 00:00:00 21时起」→ 前缀日期 + 文本内首个时刻（21:00）；
    - 「9月15日18:26」→ 台风年度 + 月日时分；
    - 纯时刻「16:20:00」/ 区间「21时至15日6时」→ 锚日期（同类事件主日期）+ 时刻；
      which='last' 时取区间末尾时刻，且「至D日」跨天按 D 日；
    - 全部解析不出（「运营开始」等描述）→ 锚日期 00:00 近似。
    """
    s = str(text or "").strip()
    if s == "":
        return None
    # 1) 完整 ISO（精确）
    for fmt in ("%Y-%m-%d %H:%M:%S", "%Y-%m-%d"):
        try:
            return datetime.strptime(s, fmt)
        except ValueError:
            pass
    # 2) ISO 日期（+时间）前缀 + 附加文本（「21时起」等）
    m = re.match(r"(\d{4}-\d{2}-\d{2}(?: \d{2}:\d{2}:\d{2})?)", s)
    if m:
        base = datetime.strptime(m.group(1)[:10], "%Y-%m-%d")
        t = _pick_time(s[len(m.group(0)):], base, which)
        warn(where, f"「{text}」→ 近似 {t:%Y-%m-%d %H:%M:%S}")
        return t
    # 3) 「9月15日18:26」式（有月有日，年份用台风年度）
    m = re.match(r"(\d{1,2})月(\d{1,2})日\s*(\d{1,2})[:：](\d{2})", s)
    if m:
        t = datetime(year, int(m.group(1)), int(m.group(2)), int(m.group(3)), int(m.group(4)))
        warn(where, f"「{text}」→ 近似 {t:%Y-%m-%d %H:%M:%S}")
        return t
    # 4) 纯时刻 / 「N时」区间 → 锚日期 + 时刻
    if _TIME_RE.search(s):
        t = _pick_time(s, anchor, which)
        warn(where, f"「{text}」→ 近似 {t:%Y-%m-%d %H:%M:%S}（锚日期 {anchor:%Y-%m-%d}）")
        return t
    # 5) 全部失败 → 锚日期 00:00
    warn(where, f"「{text}」→ 近似 {anchor:%Y-%m-%d} 00:00:00（无时间信息）")
    return anchor


def _pick_time(text, base, which):
    """从自由文本中挑时刻；which='first' 取首个、'last' 取末尾（区间结束时间），
    「至D日」跨天时 last 改用 D 日。无时刻则返回 base（00:00）。"""
    times = [(int(m.group(1)), int(m.group(2) or 0)) for m in _TIME_RE.finditer(text)]
    if not times:
        return base
    hh, mm = times[0] if which == "first" else times[-1]
    t = base.replace(hour=hh, minute=mm, second=0, microsecond=0)
    if which == "last":
        dm = re.search(r"至\s*(\d{1,2})日", text)
        if dm:
            t = t.replace(day=int(dm.group(1)))
    return t


def anchor_date(case, category):
    """同类事件中出现最多的 ISO 日期（自由文本时间的落点参考）；没有则用台风年度 1 月 1 日"""
    from collections import Counter

    days = Counter()
    for row in case.get("actions", {}).get(category, []):
        for col in ("start_time", "end_time"):
            m = re.match(r"(\d{4}-\d{2}-\d{2})", str(row.get(col, "")).strip())
            if m:
                days[m.group(1)] += 1
    if days:
        return datetime.strptime(days.most_common(1)[0][0], "%Y-%m-%d")
    year = int((case.get("overview") or {}).get("台风年度", {}).get("value") or 2000)
    return datetime(year, 1, 1)


def to_number(text, where):
    try:
        return float(text)
    except (TypeError, ValueError):
        warn(where, f"无法解析数值「{text}」")
        return 0.0


def build_case(case):
    """cases 集合文档：对齐 CaseEntity（name / values / status）"""
    overview = case.get("overview") or {}
    name = (overview.get("台风命名") or {}).get("value") or case.get("name") or case.get("case_id")
    values = {}
    for key, item in overview.items():
        options = item.get("editor_options") or ""
        values[key] = {
            "key": item.get("key", key),
            "type": item.get("type", ""),
            "value": item.get("value", ""),
            "editorType": item.get("editor_type", ""),
            "editorOptions": [o.strip() for o in options.split(",") if o.strip()],
        }
    return {"name": name, "values": values, "status": 0}


def build_action(category, row, year, anchor):
    """actions 集合文档：对齐 ActionEntity（caseId/caseName/category/fromDate/toDate/items/accessories）。
    空起止时间对齐平台 ExcelBaseDto 默认值 Date(3000, 0)（即「无结束时间」）。"""
    key_map = ITEM_KEY_MAP[category]
    items = {}
    for en, zh in key_map.items():
        if en in row:
            items[zh] = "" if row[en] is None else str(row[en])
    return {
        "category": category,
        "fromDate": parse_action_time(row.get("start_time", ""), year, anchor,
                                      f"action.{category}.start_time", "first") or NO_END,
        "toDate": parse_action_time(row.get("end_time", ""), year, anchor,
                                    f"action.{category}.end_time", "last") or NO_END,
        "items": items,
        "accessories": [],
    }


def build_path_point(name, point):
    """pathinfos 集合文档：对齐 PathInfoEntity"""
    # 风力风速拼回前端 getPower 认可的「18米/秒,8级」格式
    speed = str(point.get("speed") or "").strip()
    power = str(point.get("power") or "").strip()
    if speed and power:
        wind = f"{speed}米/秒,{power}级"
    elif speed:
        wind = f"{speed}米/秒"
    elif power:
        wind = f"{power}级"
    else:
        wind = ""

    # 风圈半径：JSON 路径源的 4 段管道值 → 前端 formatRadius 认可的三段式文本
    radius = str(point.get("radius") or "").strip()
    if "radius10" in point or "radius12" in point:
        parts = []
        for label, key in RADIUS_KEYS:
            raw = str(point.get(key) or "").strip()
            if not raw:
                continue
            nums = raw.split("|")
            if len(nums) == 4:
                parts.append(label + "：" + " ".join(
                    f"{d}{n}" for d, n in zip(RADIUS_DIRS, [x.strip() for x in nums])))
            else:
                warn(f"track.{name}.radius", f"风圈段数异常「{raw}」，原文保留")
                parts.append(f"{label}：{raw}")
        radius = "；".join(parts)

    return {
        "caseId": name,
        "time": parse_dt(point.get("time", ""), f"track.{name}.time"),
        "longitude": to_number(point.get("longitude", ""), f"track.{name}.longitude"),
        "latitude": to_number(point.get("latitude", ""), f"track.{name}.latitude"),
        "power": wind,
        "pressure": str(point.get("pressure") or "").strip(),
        "radius": radius,
        "landing": str(point.get("landing") or "").strip(),
    }


# ──────────────────────────────────────────────────────────────────────
# 导入流程
# ──────────────────────────────────────────────────────────────────────
def import_cases(db, cases, report):
    """导入 cases + actions（按 name 幂等）"""
    stats = {"cases": 0, "actions": 0, "deleted_cases": 0, "deleted_actions": 0}
    for case in cases:
        name = (case.get("overview") or {}).get("台风命名", {}).get("value") or case.get("name")
        # 1) 删除同名旧案例 + 其事件（幂等）
        old_ids = [doc["_id"] for doc in db.cases.find({"name": name})]
        if old_ids:
            del_res = db.actions.delete_many({"caseId": {"$in": old_ids}})
            db.cases.delete_many({"name": name})
            stats["deleted_cases"] += len(old_ids)
            stats["deleted_actions"] += del_res.deleted_count
            report.warn("idempotent", f"案例「{name}」已存在 {len(old_ids)} 条旧文档，已删除重建")

        # 2) 插入案例
        doc = build_case(case)
        res = db.cases.insert_one(doc)
        case_oid = res.inserted_id
        stats["cases"] += 1

        # 3) 插入事件
        year = int((case.get("overview") or {}).get("台风年度", {}).get("value") or 2000)
        per_category = {}
        for category in ACTION_CATEGORIES:
            rows = case.get("actions", {}).get(category, [])
            anchor = anchor_date(case, category) if rows else None
            for row in rows:
                action = build_action(category, row, year, anchor)
                action["caseId"] = case_oid
                action["caseName"] = name
                db.actions.insert_one(action)
            stats["actions"] += len(rows)
            per_category[category] = len(rows)

        # 4) 跳过类别记录
        for category, reason in SKIP_CATEGORIES.items():
            rows = case.get("actions", {}).get(category, [])
            if rows:
                report.skip(category, f"案例「{name}」跳过 {len(rows)} 行：{reason}")

        # 未识别类别告警（防止清洗产物未来新增类别被静默丢弃）
        known = set(ACTION_CATEGORIES) | set(SKIP_CATEGORIES)
        for category in case.get("actions", {}):
            if category not in known:
                report.warn("category", f"案例「{name}」存在未知类别「{category}」，未导入")

        report.cases.append({
            "case_id": case.get("case_id"),
            "name": name,
            "overview_items": len(case.get("overview") or {}),
            "actions": per_category,
            "actions_total": sum(per_category.values()),
        })
        print(f"  ✓ 案例「{name}」：总览 {len(case.get('overview') or {})} 项，事件 {sum(per_category.values())} 条")
    return stats


def import_paths(db, tracks, case_id_to_name, report):
    """导入 pathinfos（按 caseId 幂等）；caseId = 案例名（前端按 name 查询）"""
    stats = {"paths": 0, "points": 0, "deleted_points": 0}
    for case_id, points in tracks.items():
        name = case_id_to_name.get(case_id, case_id)  # 无案例台账的路径（利奇马）用源文件标题行编号
        del_res = db.pathinfos.delete_many({"caseId": name})
        stats["deleted_points"] += del_res.deleted_count
        if points:
            db.pathinfos.insert_many([build_path_point(name, p) for p in points])
        stats["paths"] += 1
        stats["points"] += len(points)
        report.paths.append({"case_id": case_id, "caseId_written": name, "points": len(points)})
        print(f"  ✓ 路径「{name}」：{len(points)} 个点（源 case_id={case_id}）")
    return stats


def main():
    parser = argparse.ArgumentParser(description="台风案例数据导入 MongoDB（cases/actions/pathinfos）")
    parser.add_argument("--uri", default=DEFAULT_URI, help="MongoDB 连接串")
    parser.add_argument("--input", default=DEFAULT_INPUT, help="clean_output 目录")
    parser.add_argument("--report", default=DEFAULT_REPORT, help="导入报告输出路径")
    args = parser.parse_args()

    global REPORTER
    report = Reporter()
    REPORTER = report

    with open(os.path.join(args.input, "cases.json"), encoding="utf-8") as f:
        cases = json.load(f)
    with open(os.path.join(args.input, "tracks.json"), encoding="utf-8") as f:
        tracks = json.load(f)

    print(f"连接 {args.uri} …")
    client = MongoClient(args.uri, serverSelectionTimeoutMS=10000)
    db = client.get_default_database()
    if db.name not in ("schooltyphoon",):
        report.warn("db", f"库名「{db.name}」不是 schooltyphoon，请确认 --uri 是否正确")
    print(f"目标库：{db.name}，导入前计数 → cases={db.cases.count_documents({})} "
          f"actions={db.actions.count_documents({})} pathinfos={db.pathinfos.count_documents({})}")

    # case_id → 案例名（路径 caseId 必须写案例名，前端 getPathInfos 按 name 查）
    case_id_to_name = {}
    for c in cases:
        name = (c.get("overview") or {}).get("台风命名", {}).get("value") or c.get("name")
        case_id_to_name[c["case_id"]] = name

    print(f"\n[1/2] 导入案例与事件（{len(cases)} 个案例）")
    stats_cases = import_cases(db, cases, report)

    print(f"\n[2/2] 导入台风路径（{len(tracks)} 条）")
    stats_paths = import_paths(db, tracks, case_id_to_name, report)

    # ── 导入后核对 ──
    after = {
        "cases": db.cases.count_documents({}),
        "actions": db.actions.count_documents({}),
        "pathinfos": db.pathinfos.count_documents({}),
    }
    expected_points = sum(len(v) for v in tracks.values())
    print("\n导入后核对：")
    for col, n in after.items():
        print(f"  {col}: {n}")
    print(f"  期望：cases={len(cases)}  actions={stats_cases['actions']}  "
          f"pathinfos={expected_points}（{len(tracks)} 条路径）")
    ok = (after["cases"] == len(cases)
          and after["actions"] == stats_cases["actions"]
          and after["pathinfos"] == expected_points)
    print("  " + ("✅ 计数全部一致" if ok else "❌ 计数不一致，请检查上面告警"))

    # ── 告警聚合 + 报告落盘 ──
    warn_counts = {}
    for w in report.warnings:
        key = (w["category"], w["message"])
        warn_counts[key] = warn_counts.get(key, 0) + 1
    report.warnings = [{"category": c, "message": m, "count": n} for (c, m), n in warn_counts.items()]

    summary = {
        "mongo_uri": args.uri,
        "database": db.name,
        "collections_touched": ["cases", "actions", "pathinfos"],
        "totals": {
            "cases": stats_cases["cases"],
            "actions": stats_cases["actions"],
            "paths": stats_paths["paths"],
            "points": stats_paths["points"],
            "deleted_cases": stats_cases["deleted_cases"],
            "deleted_actions": stats_cases["deleted_actions"],
            "deleted_points": stats_paths["deleted_points"],
        },
        "verified": ok,
        "verified_counts": after,
        "cases": report.cases,
        "paths": report.paths,
        "skipped": report.skipped,
        "warnings": report.warnings,
    }
    os.makedirs(os.path.dirname(os.path.abspath(args.report)), exist_ok=True)
    with open(args.report, "w", encoding="utf-8") as f:
        json.dump(summary, f, ensure_ascii=False, indent=2)
    print(f"\n导入报告：{args.report}")
    print(f"跳过项 {len(report.skipped)} 条，告警 {len(report.warnings)} 类")
    if not ok:
        sys.exit(1)


if __name__ == "__main__":
    main()
