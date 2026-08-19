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
}

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
const LIFECYCLE_WINDOW = 0.2;
/** 路径相似度距离尺度（km） */
const PATH_SCALE_KM = 500;
/** 登陆点相似度距离尺度（km） */
const LANDFALL_SCALE_KM = 300;
/** 参与相似度计算的当前路径点采样上限（均匀抽样） */
const MAX_SAMPLE_POINTS = 60;
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
    const lonN = typeof lon === "string" ? parseFloat(lon) : lon;
    const latN = typeof lat === "string" ? parseFloat(lat) : lat;
    if (!Number.isFinite(lonN) || !Number.isFinite(latN)) return null;
    return { longitude: lonN, latitude: latN, time: p?.time, power: p?.power };
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
function strongestPoint(points: CaseTrackPoint[]): CaseTrackPoint {
    const toMs = (p: CaseTrackPoint): number | null => {
        const t = new Date(p.time as any);
        return Number.isNaN(t.getTime()) ? null : t.getTime();
    };
    let bestIdx = 0;
    let bestMps = -1;
    for (let i = 0; i < points.length; i++) {
        const mps = parseWindMps(points[i].power) ?? -1;
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
    if (bestMps < 0) {
        return points[Math.floor(points.length / 2)];
    }
    return points[bestIdx];
}

export interface TrackSimilarity {
    meanNearestKm: number;
    landfallKm: number;
    score: number;
    reason: string;
}

/** 纯函数：两段路径的相似度计算（不依赖数据库，便于单测与复现） */
export function computeTrackSimilarity(current: CaseTrackPoint[], historical: CaseTrackPoint[]): TrackSimilarity {
    if (!current.length || !historical.length) {
        return { meanNearestKm: Infinity, landfallKm: Infinity, score: 0, reason: "路径点为空，无法匹配" };
    }
    // 最强时刻点必须在抽样前基于全量路径计算（抽样可能丢掉最大风力点）
    const curStrong = strongestPoint(current);
    const hisStrong = strongestPoint(historical);
    const cur = sampleEvenly(current, MAX_SAMPLE_POINTS);
    const his = historical;
    const M = his.length;

    // 1) 路径平均最近距离（生命周期窗口对齐）
    let sumKm = 0;
    for (let i = 0; i < cur.length; i++) {
        const frac = cur.length > 1 ? i / (cur.length - 1) : 0.5;
        let best = Infinity;
        for (let j = 0; j < M; j++) {
            const jFrac = M > 1 ? j / (M - 1) : 0.5;
            if (Math.abs(jFrac - frac) > LIFECYCLE_WINDOW) continue;
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
    const landfallKm = haversineKm(
        curStrong.longitude,
        curStrong.latitude,
        hisStrong.longitude,
        hisStrong.latitude,
    );

    // 3) 综合分
    const pathSim = Math.max(0, Math.min(1, 1 - meanNearestKm / PATH_SCALE_KM));
    const landfallSim = Math.max(0, Math.min(1, 1 - landfallKm / LANDFALL_SCALE_KM));
    const score = Math.round((0.7 * pathSim + 0.3 * landfallSim) * 10000) / 10000;

    const reason = `路径平均最近距离 ${meanNearestKm.toFixed(1)}km，最强时刻相距 ${landfallKm.toFixed(1)}km`;
    return { meanNearestKm, landfallKm, score, reason };
}

@Injectable()
export class CaseMatcherService {
    constructor(private readonly repo: RepoService) {}

    /**
     * 匹配与当前台风路径最相似的历史案例（Top-N）
     * @param currentTrack 当前台风路径点（{longitude, latitude, time?, power?}，兼容 lng/lat 字符串）
     * @param topN 返回数量，默认 3
     */
    async match(currentTrack: any[], topN: number = 3): Promise<CaseMatchResult[]> {
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
            pts.push({ longitude: p.longitude, latitude: p.latitude, time: p.time, power: p.power });
            byCase.set(p.caseId, pts);
        }

        // 相似度计算 + 排序
        const scored: { sim: TrackSimilarity; pathId: string; points: CaseTrackPoint[] }[] = [];
        for (const [pathId, points] of byCase) {
            const sim = computeTrackSimilarity(cur, points);
            if (!Number.isFinite(sim.score)) continue;
            scored.push({ sim, pathId, points });
        }
        scored.sort((a, b) => b.sim.score - a.sim.score);
        const top = scored.slice(0, topN);

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
        const byCat = new Map<string, any[]>();
        for (const a of actions) {
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
        const lines: string[] = [];
        for (const cat of SUMMARY_CATEGORIES) {
            if (lines.length >= 6) break;
            const list = actions.filter(a => a.category === cat).slice(0, 2);
            for (const a of list) {
                const text = this.actionToText(a);
                const when = a.fromDate ? this.formatTime(a.fromDate) : "";
                lines.push(`${when}${when ? " " : ""}【${cat}】${text}`);
            }
        }
        return lines.slice(0, 6);
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
