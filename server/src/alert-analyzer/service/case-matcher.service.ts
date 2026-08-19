import { Injectable } from "@nestjs/common";
import { Types } from "mongoose";
import { RepoService } from "src/database/service/repo/repo.service";

/**
 * 历史案例轨迹相似度匹配（M3 步骤 11）
 *
 * 用途：研判编排（analyzer.service，步骤 13）在生成研判报告前，把当前台风路径与
 * 历史案例路径（pathinfos 集合）做轨迹相似度匹配，取 Top-N 案例，返回其事件时间线
 * （actions 按 category 分组）与处置要点，作为 LLM 解读的"经验依据"。
 *
 * 相似度口径（两步，纯结构化、不依赖 embedding）：
 *  1. 路径相似度：按"生命周期进度"对齐（当前点 i 只与历史点 j 中 |j/M - i/N| ≤ 0.2 的点比），
 *     逐点取最近大圆距离（haversine）后平均 → meanNearestKm；越小越像。
 *  2. 登陆点相似度：两场台风"风力最强时刻"位置的距离 → landfallKm（power 如"18米/秒,8级"，
 *     解析 m/s 取最大；无法解析时退化为路径中段点）。越小越像。
 *  3. 综合分 score = 0.7 * clamp(1 - meanNearestKm/500) + 0.3 * clamp(1 - landfallKm/300)。
 *     500km / 300km 为经验尺度（西太平洋台风尺度），可后续按评估调整。
 */

export interface CaseTrackPoint {
    longitude: number;
    latitude: number;
    time?: Date | string;
    /** 风力文本（如"18米/秒,8级"），用于最强时刻定位；可缺省 */
    power?: string;
    /** Explicit maximum wind speed in m/s; preferred over a grade-only power value. */
    windSpeedMps?: number;
}

export interface CaseMatcherOptions {
    lifecycleWindow?: number;
    pathScaleKm?: number;
    intensityAnchorScaleKm?: number;
    pathWeight?: number;
    maxSamplePoints?: number;
}

export const DEFAULT_CASE_MATCHER_OPTIONS = Object.freeze({
    lifecycleWindow: 0.2,
    pathScaleKm: 500,
    intensityAnchorScaleKm: 300,
    pathWeight: 0.7,
    maxSamplePoints: 60,
});

export interface CaseMatchResult {
    /** 案例 Mongo _id 字符串（用于查 actions） */
    caseId: string;
    /** 案例名（pathinfos.caseId / cases.name，如"2022梅花"） */
    caseName: string;
    /** 综合相似度 0..1，越大越像 */
    score: number;
    /** 路径平均最近距离（km） */
    meanNearestKm: number;
    /** 最强时刻位置距离（km） */
    /** Distance between strongest-wind location proxies; not a verified landing-point distance. */
    landfallKm: number;
    /** 历史路径点数 */
    pathPointCount: number;
    /** 人类可读的判定说明 */
    reason: string;
    /** 事件时间线：actions 按 category 分组 */
    timeline: { category: string; count: number; samples: string[] }[];
    /** 处置要点摘要（关键类别的主要动作，供 LLM 引用） */
    summary: string[];
}

/** 生命周期间隔窗口：当前点 i 只与历史点 j 中 |j/M - i/N| ≤ WINDOW 的点比较 */
// Defaults are centralized in DEFAULT_CASE_MATCHER_OPTIONS.
/** 路径相似度距离尺度（km） */
/** 登陆点相似度距离尺度（km） */
/** 参与相似度计算的当前路径点采样上限（均匀抽样） */
/** 关键处置类别（summary 优先级） */
const SUMMARY_CATEGORIES = [
    "预警发布及响应",
    "路网指令措施",
    "线路行车措施",
    "客运措施",
    "受台风影响运营事件",
];

/** 两个经纬度点的大圆距离（km，haversine） */
export function haversineKm(lon1: number, lat1: number, lon2: number, lat2: number): number {
    const R = 6371;
    const toRad = (d: number) => (d * Math.PI) / 180;
    const dLat = toRad(lat2 - lat1);
    const dLon = toRad(lon2 - lon1);
    const a =
        Math.sin(dLat / 2) ** 2 +
        Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
    return 2 * R * Math.asin(Math.sqrt(a));
}

/** 解析 power 字段中的米/秒数值（"18米/秒,8级" → 18；无法解析返回 null） */
export function parseWindMps(power: string | undefined | null): number | null {
    if (!power) return null;
    const m = /(\d+(?:\.\d+)?)\s*米\/秒/.exec(power);
    return m ? parseFloat(m[1]) : null;
}

/** 规范化输入点（兼容 lng/lat 字符串、longitude/latitude 数值；保留 power 供最强点定位） */
export function normalizeTrackPoint(p: any): CaseTrackPoint | null {
    const lon = p?.longitude ?? p?.lng;
    const lat = p?.latitude ?? p?.lat;
    const toNumber = (value: unknown): number | null => {
        if (value === null || value === undefined) return null;
        if (typeof value === "string" && !value.trim()) return null;
        const n = typeof value === "number" ? value : Number(value);
        return Number.isFinite(n) ? n : null;
    };
    const lonN = toNumber(lon);
    const latN = toNumber(lat);
    if (lonN === null || latN === null || lonN < -180 || lonN > 180 || latN < -90 || latN > 90) return null;
    const speed = toNumber(p?.windSpeedMps ?? p?.wind_speed ?? p?.speed);
    return {
        longitude: lonN,
        latitude: latN,
        time: p?.time,
        power: typeof p?.power === "string" ? p.power : undefined,
        windSpeedMps: speed ?? undefined,
    };
}

/** 均匀抽样，把点数压到 maxN 以内 */
function sampleEvenly<T>(arr: T[], maxN: number): T[] {
    if (arr.length <= maxN) return arr;
    const step = (arr.length - 1) / (maxN - 1);
    const out: T[] = [];
    for (let i = 0; i < maxN; i++) {
        out.push(arr[Math.round(i * step)]);
    }
    return out;
}

/** 取"最强时刻"点：power 米/秒最大者（并列取时间更晚/索引更靠后，保证自匹配对称）；
 *  无解析值时取路径中段点 */
// Returns null when no point has a parseable m/s value; callers must not score a fake midpoint as intensity.
function strongestPoint(points: CaseTrackPoint[]): CaseTrackPoint | null {
    const toMs = (p: CaseTrackPoint): number | null => {
        const t = new Date(p.time as any);
        return Number.isNaN(t.getTime()) ? null : t.getTime();
    };
    let bestIdx = 0;
    let bestMps = -1;
    for (let i = 0; i < points.length; i++) {
        const mps = points[i].windSpeedMps ?? parseWindMps(points[i].power) ?? -1;
        if (mps > bestMps) {
            bestMps = mps;
            bestIdx = i;
        } else if (mps === bestMps && mps >= 0) {
            const t1 = toMs(points[i]);
            const t2 = toMs(points[bestIdx]);
            const later = t1 !== null && t2 !== null ? t1 > t2 : i > bestIdx;
            if (later) bestIdx = i;
        }
    }
    return bestMps < 0 ? null : points[bestIdx];
}

export interface TrackSimilarity {
    meanNearestKm: number;
    landfallKm: number;
    score: number;
    reason: string;
}

/** 纯函数：两段路径的相似度计算（不依赖数据库，便于单测与复现） */
export function computeTrackSimilarity(
    current: CaseTrackPoint[],
    historical: CaseTrackPoint[],
    overrides: CaseMatcherOptions = {},
): TrackSimilarity {
    const lifecycleWindow = Math.max(0, Math.min(1, overrides.lifecycleWindow ?? DEFAULT_CASE_MATCHER_OPTIONS.lifecycleWindow));
    const pathScaleKm = Math.max(1, overrides.pathScaleKm ?? DEFAULT_CASE_MATCHER_OPTIONS.pathScaleKm);
    const intensityAnchorScaleKm = Math.max(1, overrides.intensityAnchorScaleKm ?? DEFAULT_CASE_MATCHER_OPTIONS.intensityAnchorScaleKm);
    const pathWeight = Math.max(0, Math.min(1, overrides.pathWeight ?? DEFAULT_CASE_MATCHER_OPTIONS.pathWeight));
    const maxSamplePoints = Math.max(2, Math.floor(overrides.maxSamplePoints ?? DEFAULT_CASE_MATCHER_OPTIONS.maxSamplePoints));
    if (!current.length || !historical.length) {
        return { meanNearestKm: Infinity, landfallKm: Infinity, score: 0, reason: "路径点为空，无法匹配" };
    }
    // 最强时刻点必须在抽样前基于全量路径计算（抽样可能丢掉最大风力点）
    const curStrong = strongestPoint(current);
    const hisStrong = strongestPoint(historical);
    const cur = sampleEvenly(current, maxSamplePoints);
    const his = sampleEvenly(historical, maxSamplePoints);
    const M = his.length;

    // 1) 路径平均最近距离（生命周期窗口对齐）
    let sumKm = 0;
    for (let i = 0; i < cur.length; i++) {
        const frac = cur.length > 1 ? i / (cur.length - 1) : 0.5;
        let best = Infinity;
        for (let j = 0; j < M; j++) {
            const jFrac = M > 1 ? j / (M - 1) : 0.5;
            if (Math.abs(jFrac - frac) > lifecycleWindow) continue;
            const d = haversineKm(cur[i].longitude, cur[i].latitude, his[j].longitude, his[j].latitude);
            if (d < best) best = d;
        }
        if (!Number.isFinite(best)) {
            // 窗口内无点（极短路径）：退化为全局最近
            best = Math.min(
                ...his.map(h => haversineKm(cur[i].longitude, cur[i].latitude, h.longitude, h.latitude)),
            );
        }
        sumKm += best;
    }
    const meanNearestKm = sumKm / cur.length;

    // 2) 最强时刻位置距离
    const landfallKm = curStrong && hisStrong
        ? haversineKm(curStrong.longitude, curStrong.latitude, hisStrong.longitude, hisStrong.latitude)
        : Infinity;

    // 3) 综合分
    const pathSim = Math.max(0, Math.min(1, 1 - meanNearestKm / pathScaleKm));
    const hasIntensityAnchor = Number.isFinite(landfallKm);
    const intensitySim = hasIntensityAnchor
        ? Math.max(0, Math.min(1, 1 - landfallKm / intensityAnchorScaleKm))
        : 0;
    const effectivePathWeight = hasIntensityAnchor ? pathWeight : 1;
    const score = Math.round(
        (effectivePathWeight * pathSim + (hasIntensityAnchor ? (1 - pathWeight) * intensitySim : 0)) * 10000,
    ) / 10000;

    const reason = `路径平均最近距离 ${meanNearestKm.toFixed(1)}km，最强时刻相距 ${landfallKm.toFixed(1)}km`;
    const reasonText = hasIntensityAnchor
        ? reason
        : `path mean nearest ${meanNearestKm.toFixed(1)}km; no parseable wind-speed anchor (path-only score)`;
    return { meanNearestKm, landfallKm, score, reason: reasonText };
}

@Injectable()
export class CaseMatcherService {
    constructor(private readonly repo: RepoService) {}

    /**
     * 匹配与当前台风路径最相似的历史案例（Top-N）
     * @param currentTrack 当前台风路径点（{longitude, latitude, time?, power?}，兼容 lng/lat 字符串）
     * @param topN 返回数量，默认 3
     */
    // Accepts live-track aliases lng/lat plus windSpeedMps, wind_speed, or speed in m/s.
    async match(
        currentTrack: any[],
        topN: number = 3,
        options: CaseMatcherOptions = {},
    ): Promise<CaseMatchResult[]> {
        const limit = Number.isFinite(topN) ? Math.max(0, Math.floor(topN)) : 0;
        if (limit === 0) return [];
        const cur: CaseTrackPoint[] = (currentTrack || [])
            .map(normalizeTrackPoint)
            .filter((p): p is CaseTrackPoint => p !== null);
        if (!cur.length) return [];

        // 案例（status=0）→ name → _id 映射；pathinfos 只保留有案例记录的路径（利奇马有路径无案例，跳过）
        const cases = await this.repo.cases.find({ status: 0 }).lean();
        const caseByPathId = new Map<string, { id: string; name: string }>();
        for (const c of cases) {
            caseByPathId.set(c.name, { id: String(c._id), name: c.name });
        }

        const pathGroups = await this.repo.pathInfos.find({}).sort({ time: 1 }).lean();
        const byCase = new Map<string, CaseTrackPoint[]>();
        for (const p of pathGroups) {
            if (!caseByPathId.has(p.caseId)) continue;
            const pts = byCase.get(p.caseId) ?? [];
            const rawPathPoint = p as any;
            const point = normalizeTrackPoint({
                longitude: p.longitude,
                latitude: p.latitude,
                time: p.time,
                power: p.power,
                windSpeedMps: rawPathPoint.windSpeedMps ?? rawPathPoint.wind_speed ?? rawPathPoint.speed,
            });
            if (!point) continue;
            pts.push(point);
            byCase.set(p.caseId, pts);
        }

        // 相似度计算 + 排序
        const scored: { sim: TrackSimilarity; pathId: string; points: CaseTrackPoint[] }[] = [];
        for (const [pathId, points] of byCase) {
            const sim = computeTrackSimilarity(cur, points, options);
            if (!Number.isFinite(sim.score)) continue;
            scored.push({ sim, pathId, points });
        }
        scored.sort((a, b) => b.sim.score - a.sim.score);
        const top = scored.slice(0, limit);

        // 取 Top-N 案例的事件时间线（显式转 ObjectId，避免 schema 宽松时不自动转换）
        const caseIds = top.map(t => caseByPathId.get(t.pathId)!.id);
        const actions = caseIds.length
            ? await this.repo.actions
                  .find({ caseId: { $in: caseIds.map(id => new Types.ObjectId(id)) } })
                  .lean()
            : [];

        return top.map(t => {
            const info = caseByPathId.get(t.pathId)!;
            const caseActions = actions.filter(a => String(a.caseId) === info.id);
            return {
                caseId: info.id,
                caseName: info.name,
                score: t.sim.score,
                meanNearestKm: Math.round(t.sim.meanNearestKm * 10) / 10,
                landfallKm: Math.round(t.sim.landfallKm * 10) / 10,
                pathPointCount: t.points.length,
                reason: t.sim.reason,
                timeline: this.buildTimeline(caseActions),
                summary: this.buildSummary(caseActions),
            };
        });
    }

    /** actions → 按 category 分组的 timeline（count + 抽样文本） */
    buildTimeline(actions: any[]): { category: string; count: number; samples: string[] }[] {
        const ordered = [...actions].sort((a, b) => this.compareActions(a, b));
        const byCat = new Map<string, any[]>();
        for (const a of ordered) {
            const cat = a.category || "未定义行为";
            const arr = byCat.get(cat) ?? [];
            arr.push(a);
            byCat.set(cat, arr);
        }
        return [...byCat.entries()]
            .sort((a, b) => b[1].length - a[1].length)
            .map(([category, list]) => ({
                category,
                count: list.length,
                samples: list.slice(0, 3).map(a => this.actionToText(a)),
            }));
    }

    /** actions → 处置要点摘要（关键类别，最多 6 条） */
    buildSummary(actions: any[]): string[] {
        const ordered = [...actions].sort((a, b) => this.compareActions(a, b));
        const lines: string[] = [];
        for (const cat of SUMMARY_CATEGORIES) {
            if (lines.length >= 6) break;
            const list = ordered.filter(a => a.category === cat).slice(0, 2);
            for (const a of list) {
                const text = this.actionToText(a);
                const when = a.fromDate ? this.formatTime(a.fromDate) : "";
                lines.push(`${when}${when ? " " : ""}【${cat}】${text}`);
            }
        }
        return lines.slice(0, 6);
    }

    private compareActions(a: any, b: any): number {
        const ta = new Date(a?.fromDate).getTime();
        const tb = new Date(b?.fromDate).getTime();
        const aValid = Number.isFinite(ta);
        const bValid = Number.isFinite(tb);
        if (aValid && bValid && ta !== tb) return ta - tb;
        if (aValid !== bValid) return aValid ? -1 : 1;
        return String(a?._id ?? "").localeCompare(String(b?._id ?? ""));
    }

    /** action → 单行文本：取 items 中最有价值的值（跳过纯时间键） */
    private actionToText(a: any): string {
        const items: Record<string, string> = a.items || {};
        const skipKeys = new Set(["开始时间", "结束时间", "响应人数"]);
        const parts: string[] = [];
        const preferKeys = ["预警发布", "工作要点", "发布内容", "线路名称", "调整内容", "通知内容", "事件情况", "主要措施", "指令内容"];
        for (const k of preferKeys) {
            const v = items[k];
            if (v && String(v).trim()) {
                parts.push(`${k}：${v}`);
                break;
            }
        }
        if (!parts.length) {
            for (const [k, v] of Object.entries(items)) {
                if (skipKeys.has(k) || !v) continue;
                parts.push(`${k}：${v}`);
                if (parts.length >= 2) break;
            }
        }
        const text = parts.join("；") || "(无明细)";
        return text.length > 80 ? text.slice(0, 80) + "…" : text;
    }

    private formatTime(d: Date | string): string {
        const dt = new Date(d);
        if (Number.isNaN(dt.getTime())) return "";
        const pad = (n: number) => String(n).padStart(2, "0");
        return `${dt.getFullYear()}-${pad(dt.getMonth() + 1)}-${pad(dt.getDate())} ${pad(dt.getHours())}:${pad(dt.getMinutes())}`;
    }
}
