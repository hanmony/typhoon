# -*- coding: utf-8 -*-
"""
clean_data.py — 台风案例数据清洗脚本（独立运行，不依赖项目代码）

功能
====
1. 扫描「台风资料」目录，按文件内容 SHA-256 去重
2. 过滤无用文档（设计文档/值班表/照片/文献 PDF/测试用例等），只处理台风案例数据
3. 解析三类数据：
   - 案例台账（16 个 sheet：台风总览信息 + 预警/行车/客运/事件/媒体等）
   - 各区域录入表（同一台风 6 个区域表自动合并去重）
   - 台风路径数据（两种格式：传统「09月08日08时」式、JSON 结构化式）
4. 数据清洗：
   - 日期格式：Excel 序列号 / 「2021年9月7日」/「09月08日08时」/「2022/9/6 14:00:00，…」混合文本
     → 统一为 ISO 字符串；无年份的日期用台风年度补齐
   - 年份纠错：日期年份与台风年度不符（如贝碧嘉文件里误写 2022、梅花事件集序列号偏到 2023）
     → 按台风年度校正并记录告警
   - 缺失值：删除全空行、去掉首尾空白、空值统一为 ""
   - 字段名：中文列名 → 英文 snake_case（对齐服务端 cases/actions/pathinfos 实体字段）
5. 输出（clean_output/ 目录，UTF-8 JSON，可直接用于下一步导入 MongoDB）：
   - cases.json       每个台风：总览信息 + 11 类事件明细（对齐 ActionCategory）
   - tracks.json      每个台风：路径点（对齐 PathInfoEntity）
   - infra.json       线路基础设施参考表（基地/站点/存车线，各文件内容相同，只存一份）
   - cleaning_report.json  文件清单、去重/过滤/告警明细

用法
====
    python clean_data.py [数据根目录] [输出目录]

依赖
====
    pip install pandas openpyxl
"""
import json
import hashlib
import os
import re
import sys
from collections import OrderedDict
from datetime import datetime, timedelta

import pandas as pd

# ──────────────────────────────────────────────────────────────────────
# 配置区
# ──────────────────────────────────────────────────────────────────────
DEFAULT_ROOT = r"C:\Users\86182\AppData\Roaming\JetBrains\PyCharm2026.1\extensions\台风资料"
DEFAULT_OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), "clean_output")

# 台风注册表：文件名关键词 → (台风年度, 编号, 中文名)
TYPHOONS = {
    "利奇马": ("2019", "201908", "利奇马"),
    "烟花": ("2021", "202106", "烟花"),
    "灿都": ("2021", "202114", "灿都"),
    "轩岚诺": ("2022", "202211", "轩岚诺"),
    "梅花": ("2022", "202212", "梅花"),
    "贝碧嘉": ("2024", "202413", "贝碧嘉"),
    "普拉桑": ("2024", "202414", "普拉桑"),
}

# 台风编号与英文名采用权威元数据，不盲信可能由旧模板复制而来的 Excel 值。
AUTHORITATIVE_NAMES = {
    "201908": "Lekima",
    "202106": "In-Fa",
    "202114": "Chanthu",
    "202211": "Hinnamnor",
    "202212": "Muifa",
    "202413": "Bebinca",
    "202414": "Pulasan",
}

# 仓库 CaseImportService 认可的事件 sheet（ActionCategory）→ 输出统一英文名
ACTION_SHEETS = [
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

# 中文列名 → 统一英文列名（对齐服务端字段习惯）
RENAME_MAP = {
    "开始时间": "start_time",
    "结束时间": "end_time",
    "日期": "date",
    "时间": "time",
    "线路号": "line",
    "线路": "line",
    "类型": "kind",
    "车站": "station",
    "起始车站": "from_station",
    "终止车站": "to_station",
    "区间起始车站": "from_station",
    "区间终止车站": "to_station",
    "预警响应": "warning_response",
    "主要内容": "key_points",
    "主要措施": "key_points",
    "上下行": "direction",
    "存车线、折返线": "turnback",
    "基地/控制中心": "base",
    "事件类型": "event_type",
    "事件详情": "detail",
    "内容": "content",
    "区段": "section",
    "地点": "location",
    "序号": "seq",
    "行车措施（含停运、交路调整、间隔调整、正线留车、提前巡道等）": "measure",
    "行车措施（含停运、交路调整、间隔调整、正线留车、提前巡道）": "measure",
    "行车措施": "measure",
    "措施": "measure",
    "措施（确认分类）": "measure",
    "调整措施": "adjust_measure",
    "施工数量": "work_count",
    "预警种类": "warning_kind",
    "预警发布": "warning_release",
    "预警内容": "warning_content",
    "等级": "level",
    "响应岗位": "duty_post",
    "响应人数": "duty_count",
    "重点提示": "tip",
    "发布单位/部门": "publisher",
    "种类": "category",
    "工作指令": "instruction",
    "工作要点": "key_points",
    "报送范围": "report_scope",
    "发布方式": "publish_way",
    "阅读量": "read_count",
    "评论数": "comment_count",
    "备注": "remark",
}

# 无用的文档 → 过滤理由（按文件名关键词匹配，命中即跳过）
FILTER_RULES = [
    (r"01-26修订版", "旧版数据模板，内容已被「3月修正版」取代"),
    (r"台风梅花数据\(1\)", "与「台风案例基础数据/202212台风梅花数据.xlsx」内容重复"),
    (r"台风二期测试", "系统测试用例文档，不是案例数据"),
    (r"台风案例库字段", "案例库字段设计文档"),
    (r"6\.29台风事件字段", "录入表单设计文档"),
    (r"台风案例库设计完成情况", "项目进度表"),
    (r"地铁坐标数据配置表|线路站名", "地铁基础设施配置表（M4 阶段用，本轮不导入）"),
    (r"值班表|值班汇总", "台风期间值班表，非案例结构化数据"),
    (r"联系方式|支援人员", "人员联系方式，敏感信息不导入"),
    (r"行车交路|规章及处置要求", "防汛汇编附件，非案例数据"),
    (r"台风统计", "开题报告画图数据"),
    (r"\.docx?$|\.pdf$|\.pptx?$|\.jpg$|\.png$|\.txt$|\.rar$|\.zip$|\.shp$|\.shx$|\.dbf$|\.prj$|\.sbx$|\.sbn$|\.cpg$|\.xml$", "非 Excel 文件（文献/文档/照片/地图数据）"),
    (r"\.py$", "脚本文件"),
]

# 事件 sheet 中出现的纯备注列（表头为空或无意义，直接丢弃）
DROP_COLUMNS = {"nan", "Unnamed", ""}

# ──────────────────────────────────────────────────────────────────────
# 工具函数
# ──────────────────────────────────────────────────────────────────────
warnings_log = []  # 全局告警清单
_unmapped_columns = set()  # 未映射列名去重（只告警一次）


def warn(category, message):
    warnings_log.append({"category": category, "message": message})


def warn_column(name):
    if name not in _unmapped_columns:
        _unmapped_columns.add(name)
        warn("column", f"未映射的列名「{name}」，保留原名")


def norm_text(v):
    """缺失值/文本规范化：None、NaN、空串 → ""，其余去首尾空白"""
    if v is None or (isinstance(v, float) and pd.isna(v)) or str(v).strip() == "":
        return ""
    s = str(v).strip()
    return s


def to_serial(v):
    """把单元格转成 Excel 序列号（datetime 或数字都支持）"""
    if isinstance(v, (int, float)) and not pd.isna(v):
        return float(v)
    if isinstance(v, pd.Timestamp):
        # 1900 日期系统：1899-12-30 为 0 点
        return (v - pd.Timestamp("1899-12-30")).total_seconds() / 86400.0
    if isinstance(v, datetime):
        return (v - datetime(1899, 12, 30)).total_seconds() / 86400.0
    return None


def serial_to_datetime(serial):
    """Excel 序列号（1899-12-30 起点，含小数表示时分秒）→ datetime"""
    return datetime(1899, 12, 30) + timedelta(days=float(serial))


def clean_datetime(v, typhoon_year, col_hint="", date_part=None):
    """
    日期/时间统一清洗 → (iso 字符串 或 "", 是否告警)
    - date_part: 梅花事件集等「日期列+时间列」结构时传入已解析的日期
    """
    v = norm_text(v)
    if v == "":
        return "", False

    # 1) Excel 序列号（pandas 读出来是数字；纯整数当日期，带小数含时间）
    m = re.fullmatch(r"\d+(\.\d+)?", v)
    if m:
        try:
            serial = float(v)
            if serial < 1:
                # 小于 1 是「纯时间」小数（如 0.4583 = 11:00），不能当日期
                warn("date", f"{col_hint}: 「{v}」是纯时间序列号，缺少日期列，已丢弃")
                return "", True
            dt = serial_to_datetime(v)
            return _fix_year(dt, typhoon_year, col_hint)
        except Exception:
            warn("date", f"{col_hint}: 无法解析序列号日期「{v}」")
            return v, True

    # 2) 「MM月DD日HH时」/「MM月DD日HH时MM分」/「MM月DD日HH:MM」无年份（路径/事件表常见）
    m = re.fullmatch(r"(\d{1,2})月(\d{1,2})日(\d{1,2})[时:：](?:(\d{1,2})分)?", v)
    if m:
        try:
            dt = datetime(int(typhoon_year), int(m.group(1)), int(m.group(2)),
                          int(m.group(3)), int(m.group(4) or 0))
            return dt.strftime("%Y-%m-%d %H:%M:%S"), False
        except ValueError:
            warn("date", f"{col_hint}: 非法日期「{v}」")
            return v, True

    # 3) 「YYYY年M月D日」
    m = re.fullmatch(r"(\d{4})年(\d{1,2})月(\d{1,2})日", v)
    if m:
        try:
            dt = datetime(int(m.group(1)), int(m.group(2)), int(m.group(3)))
            return _fix_year(dt, typhoon_year, col_hint)
        except ValueError:
            warn("date", f"{col_hint}: 非法日期「{v}」")
            return v, True

    # 4) 「YYYY-MM-DD HH:MM:SS」/「YYYY/M/D HH:MM」标准格式（贝碧嘉有年份笔误、混合文本）
    m = re.search(r"(\d{4})[/-](\d{1,2})[/-](\d{1,2})(?:[ T](\d{1,2}):(\d{2})(?::(\d{2}))?)?", v)
    if m:
        try:
            dt = datetime(int(m.group(1)), int(m.group(2)), int(m.group(3)),
                          int(m.group(4) or 0), int(m.group(5) or 0), int(m.group(6) or 0))
            return _fix_year(dt, typhoon_year, col_hint)
        except ValueError:
            pass

    # 5) 纯时间「HH:MM:SS」（配合日期列使用）
    m = re.fullmatch(r"(\d{1,2}):(\d{2}):(\d{2})", v)
    if m and date_part:
        return date_part.strftime("%Y-%m-%d") + f" {int(m.group(1)):02d}:{m.group(2)}:{m.group(3)}", False

    # 6) 无法精确解析的时间文本（「21时起」「早晨」「中午」「2024/9/16 运营开始」）
    warn("date", f"{col_hint}: 保留原始时间文本「{v}」（无法唯一确定时刻）")
    return v, True


def _fix_year(dt, typhoon_year, col_hint):
    """年份与台风年度不符时校正（差的年份在 2 年内视为录入笔误），并告警"""
    ty = int(typhoon_year)
    if dt.year != ty and abs(dt.year - ty) <= 2:
        warn("year_fix", f"{col_hint}: 「{dt.strftime('%Y-%m-%d %H:%M:%S')}」年份 {dt.year} 与台风年度 {ty} 不符，已校正为 {ty}")
        try:
            dt = dt.replace(year=ty)
        except ValueError:  # 2/29 不存在时退一天
            dt = dt.replace(year=ty, day=28)
    elif dt.year != ty:
        warn("year_check", f"{col_hint}: 「{dt.strftime('%Y-%m-%d %H:%M:%S')}」年份 {dt.year} 与台风年度 {ty} 相差过大，请人工确认")
    return dt.strftime("%Y-%m-%d %H:%M:%S"), False


def read_excel_rows(path, sheet):
    """读 sheet → (表头行 idx, DataFrame)"""
    df = pd.read_excel(path, sheet_name=sheet, header=None, dtype=object)
    return df


def header_row_of(df):
    """找表头行：第一个非空单元格数 >= 2 的行"""
    for i in range(min(6, len(df))):
        non_empty = df.iloc[i].apply(norm_text).tolist()
        if sum(1 for c in non_empty if c) >= 2:
            return i, non_empty
    return None, None


def rows_as_dicts(df, header_idx, headers):
    """表头以下的数据行 → [dict]，删除全空行，统一字段名并清洗"""
    records = []
    for _, row in df.iloc[header_idx + 1:].iterrows():
        vals = row.tolist()
        if all(norm_text(v) == "" for v in vals):  # 全空行丢弃
            continue
        rec = {}
        for col, name in enumerate(headers):
            if col >= len(vals):
                break
            key = norm_text(name)
            if key in DROP_COLUMNS or key.startswith("Unnamed"):
                continue
            eng = RENAME_MAP.get(key, key)  # 未在映射表里的列保留中文原名（告警提示）
            if eng == key:
                warn_column(key)
            rec[eng] = norm_text(vals[col])
        # 有些表尾只有“无标题提示列”有内容。丢弃无标题列后必须再次判空，
        # 否则会生成 items 全空的垃圾事件。
        if rec and any(norm_text(v) != "" for v in rec.values()):
            records.append(rec)
    return records


# ──────────────────────────────────────────────────────────────────────
# 文件发现与分类
# ──────────────────────────────────────────────────────────────────────
def discover_files(root):
    """递归收集 Excel 文件，按文件内容 SHA-256 去重。"""
    seen = {}
    duplicates = []
    for dirpath, _, files in os.walk(root):
        for fn in files:
            if not fn.lower().endswith((".xlsx", ".xls")):
                continue
            p = os.path.join(dirpath, fn)
            digest = hashlib.sha256()
            with open(p, "rb") as source:
                for chunk in iter(lambda: source.read(1024 * 1024), b""):
                    digest.update(chunk)
            key = digest.hexdigest()
            if key in seen:
                duplicates.append({"kept": seen[key], "dropped": p, "sha256": key})
            else:
                seen[key] = p
    return list(seen.values()), duplicates


def classify(path):
    """给文件分类：case / entry / events / track_json / track_trad / filtered(理由)"""
    fn = os.path.basename(path)
    for pat, reason in FILTER_RULES:
        if re.search(pat, fn):
            return "filtered", reason

    if "台风梅花数据" in fn:
        return "track_trad", "梅花路径数据（台风案例基础数据目录）"
    if fn.endswith("台风路径数据.xlsx"):
        return "track_trad", "传统格式路径数据"
    if fn.endswith("台风事件集.xlsx"):
        return "events", "梅花专项事件集（日期+时间两列结构）"
    if "录入表" in fn:
        return "entry", "各区域录入表"
    if re.search(r"信息\.xlsx$|贝碧嘉台风\.xlsx$|数据模板3月修正版\.xlsx$", fn):
        return "case", "案例台账"
    if fn in ("贝碧嘉.xlsx", "普拉桑.xlsx"):
        return "track_json", "JSON 结构路径数据"
    return "filtered", "未识别的 Excel 文件"


def typhoon_of(fn):
    for key, info in TYPHOONS.items():
        if key in fn:
            return info
    return None


# ──────────────────────────────────────────────────────────────────────
# 各类解析函数
# ──────────────────────────────────────────────────────────────────────
def parse_overview(df, typhoon_year):
    """台风总览信息 sheet → 配置项字典 {key: {key,type,value,editor_type,editor_options}}"""
    idx, headers = header_row_of(df)
    if idx is None:
        return {}
    overview = OrderedDict()
    for _, row in df.iloc[idx + 1:].iterrows():
        vals = [norm_text(v) for v in row.tolist()]
        if not any(vals):
            continue
        key = vals[0] if len(vals) > 0 else ""
        if key == "":
            continue
        overview[key] = {
            "key": key,
            "type": vals[1] if len(vals) > 1 else "",
            "value": vals[2] if len(vals) > 2 else "",
            "editor_type": vals[3] if len(vals) > 3 else "",
            "editor_options": vals[4] if len(vals) > 4 else "",
        }
    return overview


def parse_action_sheet(df, sheet_name, typhoon_year):
    """事件类 sheet → 行 dict 列表；开始/结束时间统一清洗"""
    idx, headers = header_row_of(df)
    if idx is None:
        return []
    # 无数据行（只有表头）直接返回空
    data_rows = df.iloc[idx + 1:].apply(
        lambda r: any(norm_text(v) != "" for v in r.tolist()), axis=1
    )
    if not data_rows.any():
        return []

    records = rows_as_dicts(df, idx, headers)
    # 时间字段清洗
    for rec in records:
        # 梅花“媒体宣传”中有一条长文本错放在开始时间列。只有时间列有长文本时，
        # 将其恢复到内容字段，不把宣传内容伪造成某天 00:00 的事件时间。
        if (sheet_name.startswith("媒体宣传")
                and len(norm_text(rec.get("start_time"))) >= 20
                and not any(norm_text(rec.get(k)) for k in
                            ("content", "publish_way", "read_count", "comment_count"))):
            original = norm_text(rec.get("start_time"))
            rec["content"] = original
            rec["start_time"] = ""
            warn("field_fix", f"{sheet_name}: 长文本从 start_time 修正到 content：{original[:40]}…")
        for col in ("start_time", "end_time"):
            if col in rec and rec[col] != "":
                rec[col], _ = clean_datetime(rec[col], typhoon_year, f"{sheet_name}.{col}")
        # 梅花事件集样式：日期列 + 时间列合并
        if "date" in rec:
            d, _ = clean_datetime(rec["date"], typhoon_year, f"{sheet_name}.date")
            if "start_time" not in rec:
                rec["start_time"] = d
            if "time" in rec and rec["time"] != "":
                merged = merge_date_time(d, rec["time"], typhoon_year, sheet_name)
                rec["start_time"] = merged if merged else rec["start_time"]
            del rec["date"]
        if "time" in rec:
            if "start_time" not in rec:
                rec["start_time"], _ = clean_datetime(rec["time"], typhoon_year, f"{sheet_name}.time")
            del rec["time"]

        # 部分源表把宣传内容放在“日期/时间”列，经上面的合并步骤后才会出现。
        if (sheet_name.startswith("媒体宣传")
                and len(norm_text(rec.get("start_time"))) >= 20
                and not any(norm_text(rec.get(k)) for k in
                            ("content", "publish_way", "read_count", "comment_count"))):
            original = norm_text(rec.get("start_time"))
            rec["content"] = original
            rec["start_time"] = ""
            warn("field_fix", f"{sheet_name}: 长文本从 start_time 修正到 content：{original[:40]}…")

        # 若校正后结束时间仍早于开始时间，不猜测真实日期：清空结束时间，
        # 导入时会表示“未知”，原错误值保留在清洗报告供人工复核。
        start = _parse_clean_iso(rec.get("start_time"))
        end = _parse_clean_iso(rec.get("end_time"))
        if start and end and end < start:
            original_end = rec.get("end_time", "")
            rec["end_time"] = ""
            warn("time_order", f"{sheet_name}: 结束时间 {original_end} 早于开始时间 "
                               f"{rec.get('start_time')}，已标记为未知，请人工核对源表")
    return records


def _parse_clean_iso(value):
    """只解析已经明确到日期的清洗结果；自由文本返回 None。"""
    try:
        return datetime.strptime(norm_text(value), "%Y-%m-%d %H:%M:%S")
    except ValueError:
        return None


def ensure_authoritative_overview(case):
    """补齐编号/英文名，并纠正已知模板复制错误。"""
    overview = case["overview"]
    code = case["code"]
    expected = {
        "台风年度": case["year"],
        "台风编号": code,
        "英文名称": AUTHORITATIVE_NAMES[code],
    }
    for key, value in expected.items():
        old_value = (overview.get(key) or {}).get("value", "")
        if old_value != value:
            action = "补齐" if old_value == "" else f"纠正原值“{old_value}”"
            warn("metadata_fix", f"{case['case_id']}.{key}: {action}为“{value}”")
        if key not in overview:
            overview[key] = {
                "key": key,
                "type": "通用",
                "value": value,
                "editor_type": "",
                "editor_options": "",
            }
        else:
            overview[key]["value"] = value


def merge_date_time(date_iso, time_raw, typhoon_year, sheet_name):
    """日期 + 时间文本 合并（时间可能是序列号小数 / HH:MM / 「21时起」）"""
    t = norm_text(time_raw)
    if t == "":
        return date_iso
    # 序列号小数（0.4583 = 11:00）→ 时分秒，拼日期
    m = re.fullmatch(r"0?\.\d+", t)
    if m:
        secs = round(float(t) * 86400)
        return date_iso[:10] + " " + (
            f"{secs // 3600:02d}:{(secs % 3600) // 60:02d}:{secs % 60:02d}")
    # 纯时间 HH:MM(:SS)
    m = re.fullmatch(r"(\d{1,2}):(\d{2})(?::(\d{2}))?", t)
    if m:
        return date_iso[:10] + f" {int(m.group(1)):02d}:{m.group(2)}:{m.group(3) or '00'}"
    # 「21时起」等文本无法合并 → 拼接保留
    return date_iso + " " + t if date_iso else t


def parse_track_traditional(df, typhoon_year, case_id):
    """传统路径表：标题行=编号+名称，表头「时间/中心位置/风速风力/中心气压/风圈半径（公里）/登陆信息」"""
    # 找表头行（含「时间」与「中心位置」）
    header_idx = None
    for i in range(min(6, len(df))):
        row = [norm_text(v) for v in df.iloc[i].tolist()]
        if "时间" in row and "中心位置" in row:
            header_idx = i
            break
    if header_idx is None:
        return []
    headers = [norm_text(v) for v in df.iloc[header_idx].tolist()]
    tracks = []
    for _, row in df.iloc[header_idx + 1:].iterrows():
        vals = [norm_text(v) for v in row.tolist()]
        if not any(vals):
            continue
        # 跳过行首空列（梅花路径文件前两列为空）
        first = next((i for i, v in enumerate(vals) if v != ""), len(vals))
        vals = vals[first:]
        time_raw = vals[0] if len(vals) > 0 else ""
        pos_raw = vals[1] if len(vals) > 1 else ""
        wind_raw = vals[2] if len(vals) > 2 else ""
        press_raw = vals[3] if len(vals) > 3 else ""
        radius_raw = vals[4] if len(vals) > 4 else ""
        landing_raw = vals[5] if len(vals) > 5 else ""

        time_iso, _ = clean_datetime(time_raw, typhoon_year, f"track.{case_id}.time")

        # 中心位置：「东经132.9° 北纬17.4°」/「东经126.5°北纬23.89」→ 经纬度数字（° 可省略）
        lng = lat = ""
        m = re.search(r"东经\s*([\d.]+)°?\s*北纬\s*([\d.]+)", pos_raw)
        if m:
            lng, lat = m.group(1), m.group(2)
            if "%" in pos_raw:
                warn("track", f"track.{case_id}: 中心位置含异常字符「{pos_raw}」（已按数字解析）")
        else:
            warn("track", f"track.{case_id}: 中心位置格式异常「{pos_raw}」")

        # 风速风力：「18米/秒,8级」/「65米秒,17级以上」→ speed=18, power=8级（米/秒、米每秒、米秒均可）
        speed = power = ""
        m = re.search(r"([\d.]+)\s*米[/每]?秒\s*,?\s*([\d.]+)\s*级", wind_raw)
        if m:
            speed, power = m.group(1), m.group(2)
        else:
            warn("track", f"track.{case_id}: 风速风力格式异常「{wind_raw}」")

        # 中心气压：「998百帕」→ 数字
        pressure = ""
        m = re.search(r"([\d.]+)\s*百帕", press_raw)
        if m:
            pressure = m.group(1)

        tracks.append({
            "case_id": case_id,
            "time": time_iso,
            "longitude": lng,
            "latitude": lat,
            "power": power,          # 风力等级
            "speed": speed,          # 风速（米/秒）
            "pressure": pressure,    # 中心气压（百帕）
            "radius": radius_raw,    # 风圈半径原文（七级：东北xx 东南xx…）
            "landing": landing_raw,
        })
    return tracks


def parse_track_json(df, case_id):
    """JSON 结构化路径表：time/lng/lat/power/speed/pressure/radius7/radius10/radius12/login"""
    idx, headers = header_row_of(df)
    if idx is None:
        return []
    headers = [norm_text(v) for v in headers]
    tracks = []
    for _, row in df.iloc[idx + 1:].iterrows():
        vals = [norm_text(v) for v in row.tolist()]
        if not any(vals):
            continue
        rec = {}
        for col, name in enumerate(headers):
            if col >= len(vals) or name in DROP_COLUMNS:
                continue
            rec[name] = vals[col]
        tracks.append({
            "case_id": case_id,
            "time": rec.get("time", ""),
            "longitude": rec.get("lng", ""),
            "latitude": rec.get("lat", ""),
            "power": rec.get("power", ""),
            "speed": rec.get("speed", ""),
            "pressure": rec.get("pressure", ""),
            "radius": rec.get("radius7", ""),
            "radius10": rec.get("radius10", ""),
            "radius12": rec.get("radius12", ""),
            "landing": rec.get("login", ""),
        })
    return tracks


def parse_infra(df, sheet_name):
    """基地/站点/存车线参考表：每列一条线路 → {线路: [值...]}"""
    idx, headers = header_row_of(df)
    if idx is None:
        return {}
    headers = [norm_text(v).lstrip("_") for v in headers]
    result = OrderedDict()
    for col, name in enumerate(headers):
        if name in DROP_COLUMNS:
            continue
        vals = []
        for _, row in df.iloc[idx + 1:].iterrows():
            v = norm_text(row.tolist()[col] if col < len(row.tolist()) else "")
            if v:
                vals.append(v)
        result[name] = vals
    return result


# ──────────────────────────────────────────────────────────────────────
# 主流程
# ──────────────────────────────────────────────────────────────────────
def main():
    root = sys.argv[1] if len(sys.argv) > 1 else DEFAULT_ROOT
    out_dir = sys.argv[2] if len(sys.argv) > 2 else DEFAULT_OUT
    os.makedirs(out_dir, exist_ok=True)

    files, duplicates = discover_files(root)
    inventory = []
    cases = OrderedDict()   # case_id -> case dict
    tracks = OrderedDict()  # case_id -> track list
    track_files_used = {}   # case_id -> 用哪个文件（JSON 优先）
    infra = {}              # sheet_name -> {线路: [...]}（各文件内容相同，只存一份）

    for path in sorted(files):
        fn = os.path.basename(path)
        kind, reason = classify(path)
        inventory.append({"file": path.replace(root, "…"), "class": kind, "reason": reason})
        if kind == "filtered":
            continue

        typhoon = typhoon_of(fn)
        if typhoon is None:
            warn("classify", f"{fn}: 无法识别台风，跳过")
            continue
        year, code, name_cn = typhoon
        case_id = f"{code}{name_cn}"  # 与路径文件标题行一致，如「202106烟花」

        try:
            xls = pd.ExcelFile(path)
        except Exception as e:
            warn("read", f"{fn}: 读取失败 {e}")
            continue

        # ── 路径数据 ──
        if kind == "track_json":
            # JSON 是结构化来源，显式覆盖此前扫描到的传统表，而不是依赖文件排序。
            if case_id in track_files_used:
                warn("track_priority", f"{case_id}: JSON 路径 {fn} 替换 {track_files_used[case_id]}")
            tracks[case_id] = parse_track_json(
                pd.read_excel(path, sheet_name=xls.sheet_names[0], header=None, dtype=object), case_id)
            track_files_used[case_id] = fn
            continue
        if kind == "track_trad":
            if case_id not in track_files_used:
                tracks[case_id] = parse_track_traditional(
                    pd.read_excel(path, sheet_name=xls.sheet_names[0], header=None, dtype=object),
                    year, case_id)
                track_files_used[case_id] = fn
            else:
                warn("dedupe_track", f"{fn}: {case_id} 已采用 {track_files_used[case_id]}，此文件跳过")
            continue

        # ── 案例台账 / 录入表 / 事件集 ──
        case = cases.setdefault(case_id, {
            "case_id": case_id,
            "name": name_cn,
            "year": year,
            "code": code,
            "overview": OrderedDict(),
            "actions": {s: [] for s in ACTION_SHEETS},
            "source_files": [],
        })
        case["source_files"].append(fn)

        for sheet in xls.sheet_names:
            df = read_excel_rows(path, sheet)

            if sheet == "台风总览信息":
                ov = parse_overview(df, year)
                # 并集合并：录入表补充的键（如「影响线路」）加到台账总览里，已有的不覆盖
                for k, item in ov.items():
                    if k not in case["overview"]:
                        case["overview"][k] = item
                continue

            if sheet in ACTION_SHEETS:
                rows = parse_action_sheet(df, sheet, year)
                case["actions"][sheet].extend(rows)
                continue

            # 梅花事件集的特有 sheet：预警发布及响应(调度部）等带括号后缀
            if any(sheet.startswith(s) for s in ACTION_SHEETS):
                base = next(s for s in ACTION_SHEETS if sheet.startswith(s))
                rows = parse_action_sheet(df, sheet, year)
                case["actions"][base].extend(rows)
                continue

            if sheet in ("基地数据", "站点数据", "存车线、折返线"):
                if sheet not in infra:  # 各文件内容相同，只存第一份
                    infra[sheet] = parse_infra(df, sheet)
                continue

            if sheet == "舆情及敏感信息":
                idx, headers = header_row_of(df)
                if idx is not None:
                    case["actions"]["舆情及敏感信息"] = case["actions"].get("舆情及敏感信息", []) + [
                        {norm_text(headers[c]) if c < len(headers) else f"c{c}": norm_text(r.tolist()[c] if c < len(r.tolist()) else "")
                         for c in range(max(len(headers), len(r.tolist())))}
                        for _, r in df.iloc[idx + 1:].iterrows()
                        if any(norm_text(v) != "" for v in r.tolist())
                    ]
                continue

            warn("sheet", f"{fn} / sheet「{sheet}」未处理")

    # ── 录入表合并后的行去重（同一台风 6 个区域表可能重复记录同一事件）──
    for cid, case in cases.items():
        ensure_authoritative_overview(case)
        for sheet, rows in case["actions"].items():
            seen = set()
            unique = []
            for r in rows:
                key = json.dumps(r, ensure_ascii=False, sort_keys=True)
                if key not in seen:
                    seen.add(key)
                    unique.append(r)
            case["actions"][sheet] = unique

    # ── 输出 ──
    # 相同告警合并计数，报告更易读
    warn_counts = OrderedDict()
    for w in warnings_log:
        key = (w["category"], w["message"])
        if key not in warn_counts:
            warn_counts[key] = 1
        else:
            warn_counts[key] += 1
    warnings_uniq = [{"category": c, "message": m, "count": n} for (c, m), n in warn_counts.items()]

    with open(os.path.join(out_dir, "cases.json"), "w", encoding="utf-8") as f:
        json.dump(list(cases.values()), f, ensure_ascii=False, indent=2)
    with open(os.path.join(out_dir, "tracks.json"), "w", encoding="utf-8") as f:
        json.dump(tracks, f, ensure_ascii=False, indent=2)
    with open(os.path.join(out_dir, "infra.json"), "w", encoding="utf-8") as f:
        json.dump(infra, f, ensure_ascii=False, indent=2)
    with open(os.path.join(out_dir, "cleaning_report.json"), "w", encoding="utf-8") as f:
        json.dump({
            "duplicates_dropped": duplicates,
            "inventory": inventory,
            "warnings": warnings_uniq,
        }, f, ensure_ascii=False, indent=2)

    # ── 控制台摘要 ──
    print("=" * 60)
    print("清洗完成。输出目录:", out_dir)
    print(f"发现 Excel 文件 {len(files)} 个；去重丢弃 {len(duplicates)} 个副本")
    used = [i for i in inventory if i["class"] != "filtered"]
    filtered = [i for i in inventory if i["class"] == "filtered"]
    print(f"参与清洗 {len(used)} 个；过滤无用文档 {len(filtered)} 个")
    print("-" * 60)
    print("台风案例:")
    for cid, case in cases.items():
        total = sum(len(v) for v in case["actions"].values())
        print(f"  {cid}  总览项 {len(case['overview'])}  事件明细 {total} 条  来源 {len(case['source_files'])} 个文件")
    for cid, tr in tracks.items():
        print(f"  路径 {cid}: {len(tr)} 个点（来源 {track_files_used.get(cid)}）")
    print("-" * 60)
    print(f"告警 {len(warnings_uniq)} 类（共 {len(warnings_log)} 处，详见 cleaning_report.json）")
    by_cat = OrderedDict()
    for w in warnings_uniq:
        by_cat[w["category"]] = by_cat.get(w["category"], 0) + w["count"]
    for cat, n in sorted(by_cat.items(), key=lambda x: -x[1]):
        print(f"  [{cat}] {n} 处")
    print("=" * 60)


if __name__ == "__main__":
    try:
        sys.stdout.reconfigure(encoding="utf-8")
    except Exception:
        pass
    main()
