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

安全与幂等
==========
默认只做 dry-run，不连接数据库。只有显式传入 --apply 才会写库。
写入前先在内存构建和验证全部文档；替换单个案例或路径失败时恢复原数据。
重复执行结果不变，并保留案例最初的 createdAt。

跳过与告警
==========
- 「舆情及敏感信息」不在仓库 ActionCategory 枚举中（平台 CaseImportService 也不导入该 sheet），
  且其内容（热线接听总量等）已存在于案例总览 values 中 → 跳过并记入报告；
- 未在映射表中的英文字段、非法日期/经纬度等 → 告警记入报告。

用法
====
    # 默认预演，不写数据库
    python import_cases_to_mongo.py

    # 确认后写正式库（必须显式 --apply）
    python import_cases_to_mongo.py --uri mongodb://127.0.0.1:27017/schooltyphoon --apply

依赖
====
    pip install pymongo
"""
import argparse
import json
import os
import re
import sys
from datetime import datetime, timezone
from urllib.parse import urlsplit, urlunsplit

try:
    from bson import ObjectId
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
        self.time_quality = {"exact": 0, "inferred": 0, "unknown": 0}

    def warn(self, category, message):
        self.warnings.append({"category": category, "message": message})

    def skip(self, category, message):
        self.skipped.append({"category": category, "message": message})

    def record_time_quality(self, quality):
        self.time_quality[quality] += 1


REPORTER = None  # 全局报告器，main 里初始化；工具函数通过 warn() 上报


def warn(category, message):
    if REPORTER is not None:
        REPORTER.warn(category, message)


def record_time_quality(quality):
    if REPORTER is not None:
        REPORTER.record_time_quality(quality)


def mask_mongo_uri(uri):
    """报告和终端中隐藏 MongoDB 用户名、密码。"""
    try:
        parts = urlsplit(uri)
        hostname = parts.hostname or ""
        if ":" in hostname and not hostname.startswith("["):
            hostname = f"[{hostname}]"
        netloc = hostname
        if parts.port:
            netloc += f":{parts.port}"
        if parts.username is not None:
            netloc = f"***:***@{netloc}"
        return urlunsplit((parts.scheme, netloc, parts.path, parts.query, parts.fragment))
    except (TypeError, ValueError):
        return "<invalid MongoDB URI>"


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
        record_time_quality("unknown")
        return None
    # 1) 完整 ISO（精确）
    for fmt in ("%Y-%m-%d %H:%M:%S", "%Y-%m-%d"):
        try:
            value = datetime.strptime(s, fmt)
            record_time_quality("exact")
            return value
        except ValueError:
            pass
    # 2) ISO 日期（+时间）前缀 + 附加文本（「21时起」等）
    m = re.match(r"(\d{4}-\d{2}-\d{2}(?: \d{2}:\d{2}:\d{2})?)", s)
    if m:
        base = datetime.strptime(m.group(1)[:10], "%Y-%m-%d")
        t = _pick_time(s[len(m.group(0)):], base, which)
        warn(where, f"「{text}」→ 近似 {t:%Y-%m-%d %H:%M:%S}")
        record_time_quality("inferred")
        return t
    # 3) 「9月15日18:26」式（有月有日，年份用台风年度）
    m = re.match(r"(\d{1,2})月(\d{1,2})日\s*(\d{1,2})[:：](\d{2})", s)
    if m:
        t = datetime(year, int(m.group(1)), int(m.group(2)), int(m.group(3)), int(m.group(4)))
        warn(where, f"「{text}」→ 近似 {t:%Y-%m-%d %H:%M:%S}")
        record_time_quality("inferred")
        return t
    # 4) 纯时刻 / 「N时」区间 → 锚日期 + 时刻
    if _TIME_RE.search(s):
        t = _pick_time(s, anchor, which)
        warn(where, f"「{text}」→ 近似 {t:%Y-%m-%d %H:%M:%S}（锚日期 {anchor:%Y-%m-%d}）")
        record_time_quality("inferred")
        return t
    # 5) 全部失败 → 锚日期 00:00
    warn(where, f"「{text}」→ 近似 {anchor:%Y-%m-%d} 00:00:00（无时间信息）")
    record_time_quality("inferred")
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


def build_case(case, created_at=None):
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
    now = datetime.now(timezone.utc)
    return {
        "name": name,
        "values": values,
        "status": 0,
        "createdAt": created_at or now,
        "updatedAt": now,
    }


def build_action(category, row, year, anchor):
    """actions 集合文档：对齐 ActionEntity（caseId/caseName/category/fromDate/toDate/items/accessories）。
    空起止时间对齐平台 ExcelBaseDto 默认值 Date(3000, 0)（即「无结束时间」）。"""
    key_map = ITEM_KEY_MAP[category]
    items = {}
    for en, zh in key_map.items():
        if en in row:
            items[zh] = "" if row[en] is None else str(row[en])
    from_date = parse_action_time(row.get("start_time", ""), year, anchor,
                                  f"action.{category}.start_time", "first") or NO_END
    to_date = parse_action_time(row.get("end_time", ""), year, anchor,
                                f"action.{category}.end_time", "last") or NO_END
    if from_date != NO_END and to_date != NO_END and to_date < from_date:
        warn("time_order", f"action.{category}: 结束时间 {to_date} 早于开始时间 {from_date}，已标记为未知")
        to_date = NO_END
    return {
        "category": category,
        "fromDate": from_date,
        "toDate": to_date,
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


def prepare_payload(cases, tracks, report):
    """先在内存中构建并验证全部文档；失败时数据库尚未发生任何变化。"""
    prepared_cases = []
    case_id_to_name = {}
    names = set()

    for case in cases:
        case_doc = build_case(case)
        name = case_doc["name"]
        if not name or name in names:
            raise ValueError(f"案例名称为空或重复：{name!r}")
        names.add(name)
        case_id_to_name[case["case_id"]] = name
        case_doc["_id"] = ObjectId()

        year = int((case.get("overview") or {}).get("台风年度", {}).get("value") or 2000)
        action_docs = []
        per_category = {}
        for category in ACTION_CATEGORIES:
            rows = case.get("actions", {}).get(category, [])
            anchor = anchor_date(case, category) if rows else None
            for row in rows:
                action = build_action(category, row, year, anchor)
                if not any(str(v or "").strip() for v in action["items"].values()):
                    raise ValueError(f"案例「{name}」的「{category}」存在全空事件")
                action["caseId"] = case_doc["_id"]
                action["caseName"] = name
                action_docs.append(action)
            per_category[category] = len(rows)

        for category, reason in SKIP_CATEGORIES.items():
            rows = case.get("actions", {}).get(category, [])
            if rows:
                report.skip(category, f"案例「{name}」跳过 {len(rows)} 行：{reason}")
        known = set(ACTION_CATEGORIES) | set(SKIP_CATEGORIES)
        for category in case.get("actions", {}):
            if category not in known:
                report.warn("category", f"案例「{name}」存在未知类别「{category}」，未导入")

        report.cases.append({
            "case_id": case.get("case_id"),
            "name": name,
            "overview_items": len(case.get("overview") or {}),
            "actions": per_category,
            "actions_total": len(action_docs),
        })
        prepared_cases.append({"case": case_doc, "actions": action_docs})

    prepared_paths = []
    for case_id, points in tracks.items():
        name = case_id_to_name.get(case_id, case_id)
        docs = [build_path_point(name, p) for p in points]
        for index, doc in enumerate(docs):
            if doc["time"] is None or not (-180 <= doc["longitude"] <= 180) or not (-90 <= doc["latitude"] <= 90):
                raise ValueError(f"路径「{name}」第 {index + 1} 点缺时间或经纬度非法")
        prepared_paths.append({"case_id": case_id, "name": name, "points": docs})
        report.paths.append({"case_id": case_id, "caseId_written": name, "points": len(docs)})

    return prepared_cases, prepared_paths


def ensure_indexes(db):
    """为全新数据库补齐 Mongoose schema 声明的查询索引。"""
    db.cases.create_index([("name", 1)], name="name_1")
    db.actions.create_index([("caseId", 1)], name="caseId_1")
    db.actions.create_index([("caseName", 1)], name="caseName_1")
    db.actions.create_index([("category", 1)], name="category_1")
    db.pathinfos.create_index([("caseId", 1)], name="caseId_1")


# ──────────────────────────────────────────────────────────────────────
# 导入流程
# ──────────────────────────────────────────────────────────────────────
def apply_cases(db, prepared_cases, report):
    """替换 cases + actions；单个案例失败时恢复原数据。"""
    stats = {"cases": 0, "actions": 0, "deleted_cases": 0, "deleted_actions": 0}
    for prepared in prepared_cases:
        case_doc = prepared["case"]
        action_docs = prepared["actions"]
        name = case_doc["name"]
        old_cases = list(db.cases.find({"name": name}))
        old_ids = [doc["_id"] for doc in old_cases]
        old_actions = list(db.actions.find({"caseId": {"$in": old_ids}})) if old_ids else []

        created_values = [doc.get("createdAt") for doc in old_cases if doc.get("createdAt")]
        if created_values:
            case_doc["createdAt"] = min(created_values)

        # MongoDB 单机模式没有事务：先内存备份，写入失败就恢复旧文档。
        if old_ids:
            db.actions.delete_many({"caseId": {"$in": old_ids}})
            db.cases.delete_many({"name": name})
            stats["deleted_cases"] += len(old_ids)
            stats["deleted_actions"] += len(old_actions)
            report.warn("idempotent", f"案例「{name}」已存在 {len(old_ids)} 条旧文档，已删除重建")
        try:
            db.cases.insert_one(case_doc)
            if action_docs:
                db.actions.insert_many(action_docs, ordered=True)
        except Exception:
            db.actions.delete_many({"caseId": case_doc["_id"]})
            db.cases.delete_many({"_id": case_doc["_id"]})
            if old_cases:
                db.cases.insert_many(old_cases, ordered=True)
            if old_actions:
                db.actions.insert_many(old_actions, ordered=True)
            raise

        stats["cases"] += 1
        stats["actions"] += len(action_docs)
        print(f"  ✓ 案例「{name}」：事件 {len(action_docs)} 条")
    return stats


def apply_paths(db, prepared_paths):
    """替换 pathinfos；单条路径失败时恢复原数据。"""
    stats = {"paths": 0, "points": 0, "deleted_points": 0}
    for prepared in prepared_paths:
        case_id = prepared["case_id"]
        name = prepared["name"]
        points = prepared["points"]
        old_points = list(db.pathinfos.find({"caseId": name}))
        db.pathinfos.delete_many({"caseId": name})
        stats["deleted_points"] += len(old_points)
        try:
            if points:
                db.pathinfos.insert_many(points, ordered=True)
        except Exception:
            db.pathinfos.delete_many({"caseId": name})
            if old_points:
                db.pathinfos.insert_many(old_points, ordered=True)
            raise
        stats["paths"] += 1
        stats["points"] += len(points)
        print(f"  ✓ 路径「{name}」：{len(points)} 个点（源 case_id={case_id}）")
    return stats


def main():
    parser = argparse.ArgumentParser(description="台风案例数据导入 MongoDB（cases/actions/pathinfos）")
    parser.add_argument("--uri", default=DEFAULT_URI, help="MongoDB 连接串")
    parser.add_argument("--input", default=DEFAULT_INPUT, help="clean_output 目录")
    parser.add_argument("--report", default=DEFAULT_REPORT, help="导入报告输出路径")
    parser.add_argument("--apply", action="store_true",
                        help="实际写入数据库；不加此参数时只做预演和校验")
    parser.add_argument("--allow-other-database", action="store_true",
                        help="允许写入非 schooltyphoon 库（仅用于显式指定的隔离测试库）")
    args = parser.parse_args()

    global REPORTER
    report = Reporter()
    REPORTER = report

    with open(os.path.join(args.input, "cases.json"), encoding="utf-8") as f:
        cases = json.load(f)
    with open(os.path.join(args.input, "tracks.json"), encoding="utf-8") as f:
        tracks = json.load(f)

    print("[1/3] 在内存中构建并校验全部文档")
    prepared_cases, prepared_paths = prepare_payload(cases, tracks, report)
    expected = {
        "cases": len(prepared_cases),
        "actions": sum(len(p["actions"]) for p in prepared_cases),
        "paths": len(prepared_paths),
        "points": sum(len(p["points"]) for p in prepared_paths),
    }
    print(f"  ✓ 校验通过：{expected['cases']} 案例 / {expected['actions']} 事件 / "
          f"{expected['paths']} 条路径（{expected['points']} 点）")

    database_name = None
    after = dict(expected)
    stats_cases = {"cases": expected["cases"], "actions": expected["actions"],
                   "deleted_cases": 0, "deleted_actions": 0}
    stats_paths = {"paths": expected["paths"], "points": expected["points"], "deleted_points": 0}
    ok = True

    if args.apply:
        print(f"[2/3] 连接 {mask_mongo_uri(args.uri)}")
        client = MongoClient(args.uri, serverSelectionTimeoutMS=10000)
        db = client.get_default_database()
        database_name = db.name
        if db.name != "schooltyphoon" and not args.allow_other_database:
            sys.exit(f"拒绝写入数据库「{db.name}」：测试库必须同时加 --allow-other-database")

        print(f"  目标库：{db.name}；开始安全替换")
        ensure_indexes(db)
        stats_cases = apply_cases(db, prepared_cases, report)
        stats_paths = apply_paths(db, prepared_paths)

        case_ids = [p["case"]["_id"] for p in prepared_cases]
        path_names = [p["name"] for p in prepared_paths]
        after = {
            "cases": db.cases.count_documents({"_id": {"$in": case_ids}}),
            "actions": db.actions.count_documents({"caseId": {"$in": case_ids}}),
            "paths": len(prepared_paths),
            "points": db.pathinfos.count_documents({"caseId": {"$in": path_names}}),
        }
        ok = after == expected
        print("[3/3] 仅核对本次导入范围：" + ("✅ 全部一致" if ok else "❌ 数量不一致"))
    else:
        print("[2/3] DRY-RUN 预演模式：未连接数据库，也未写入任何数据")
        print("[3/3] 若确认要写隔离测试库，请显式添加 --apply --allow-other-database")

    # ── 告警聚合 + 报告落盘 ──
    warn_counts = {}
    for w in report.warnings:
        key = (w["category"], w["message"])
        warn_counts[key] = warn_counts.get(key, 0) + 1
    report.warnings = [{"category": c, "message": m, "count": n} for (c, m), n in warn_counts.items()]

    summary = {
        "mode": "apply" if args.apply else "dry-run",
        "mongo_uri": mask_mongo_uri(args.uri),
        "database": database_name,
        "collections_touched": ["cases", "actions", "pathinfos"] if args.apply else [],
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
        "expected_counts": expected,
        "verified_counts": after,
        "time_quality": report.time_quality,
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
