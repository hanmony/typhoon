import { Injectable, Logger, OnModuleInit } from "@nestjs/common";
import * as fs from "fs";
import * as path from "path";
import * as turf from "@turf/turf";
import { Feature, Polygon } from "geojson";
import { WindCircleService } from "src/typhoon/alert/wind-circle.service";
import { TyphoonStateDto } from "src/typhoon/alert/dto/alert.dto";

/**
 * 线路空间研判（M4 步骤 16）：turf 风圈 × 线路相交
 *
 * 数据来源：`assets/line/metro-2026.json`（步骤 15 迁移，21 条线 / 27 段 / 3539 点，
 * 已套用前端显示偏移修正，与 wind-circle 同一坐标框架）。
 *
 * 关键口径（审查要求，勿回退）：
 *  - **读取 `lineStrings`**，把 `{lng, lat}` 对象**转换为 `[lng, lat]`**（Turf 坐标序）；
 *  - 每条线用 **`turf.multiLineString`** 构建（保留分支，如 2 号线东延伸等 6 条多段线）；
 *  - 风圈来自 wind-circle 的 `getTyphoonCircleFeature`（7 级风圈四象限扇形，输出为
 *    `[lat, lng]`），**使用前转换为 `[lng, lat]`** 再 `turf.polygon`；
 *  - 相交判定：`turf.booleanIntersects`（已覆盖重叠与穿越；**不用 booleanCrosses**——turf 的
 *    booleanCrosses 不支持 MultiLineString 会抛错，且 intersects 语义已足够）；
 *  - 影响时间窗口：沿台风整条轨迹，逐状态统计该线路与风圈相交的时刻区间 [start, end]。
 *
 * 已知限制：radius 全 0（无风圈数据）的状态跳过；本服务不做预测窗口外推（步骤 17 集成时
 * 可由编排层决定用当前时刻还是整条轨迹）。
 */

export interface LineImpactResult {
    /** 线路名（如"1号线""机场联络线"） */
    line: string;
    /** 是否受影响 */
    affected: boolean;
    /** 影响时间窗口起始（首次相交时刻） */
    windowStart?: Date;
    /** 影响时间窗口结束（最后一次相交时刻） */
    windowEnd?: Date;
    /** 与风圈相交的轨迹点数（影响强度参考，越大越持久） */
    hitCount: number;
}

@Injectable()
export class LineImpactService implements OnModuleInit {
    private readonly logger = new Logger(LineImpactService.name);
    /** lineName → 分支段数组，每段为 [lng, lat][]（Turf 坐标序） */
    private lineStrings: Record<string, number[][][]> = {};

    constructor(private readonly windCircle: WindCircleService) {}

    async onModuleInit() {
        const assetPath = path.resolve(process.cwd(), "assets/line/metro-2026.json");
        if (!fs.existsSync(assetPath)) {
            this.logger.warn("assets/line/metro-2026.json 不存在，线路空间研判不可用（部署需随 assets/ 交付）");
            return;
        }
        const asset = JSON.parse(fs.readFileSync(assetPath, "utf8"));
        const rawLineStrings = asset.lineStrings;
        if (!rawLineStrings || typeof rawLineStrings !== "object") {
            throw new Error("metro-2026.json 缺少 lineStrings 字段");
        }
        for (const [name, segments] of Object.entries(rawLineStrings)) {
            // {lng, lat} → [lng, lat]（Turf 坐标序）
            this.lineStrings[name] = (segments as any[]).map(seg =>
                (seg as any[]).map(p => [Number(p.lng), Number(p.lat)] as [number, number]),
            );
        }
        const segCount = Object.values(this.lineStrings).reduce((sum, segs) => sum + segs.length, 0);
        this.logger.log(`线路资产已加载：${Object.keys(this.lineStrings).length} 条线 / ${segCount} 段`);
    }

    /** 已加载的线路名（空 = 资产缺失） */
    getLoadedLines(): string[] {
        return Object.keys(this.lineStrings);
    }

    /**
     * 风圈 × 线路相交研判
     * @param typhoonData 台风数据：新 schema（tracks）或旧 schema（points，dummy 源），含 radius7 风圈
     * @returns 受影响线路列表（按命中点数降序）；无资产或无风圈时返回 []
     */
    analyze(typhoonData: any): LineImpactResult[] {
        if (!Object.keys(this.lineStrings).length) return [];
        const states = this.toStates(typhoonData);
        if (!states.length) return [];

        const perLine = new Map<string, { hit: number; times: Date[] }>();
        for (const state of states) {
            const polygons = this.windCircleToPolygons(state);
            if (!polygons.length) continue;
            for (const [name, segments] of Object.entries(this.lineStrings)) {
                // 每条线用 multiLineString 构建（保留分支）
                const lineFeature = turf.multiLineString(segments);
                const hit = polygons.some(poly => turf.booleanIntersects(poly, lineFeature));
                if (hit) {
                    const rec = perLine.get(name) ?? { hit: 0, times: [] };
                    rec.hit += 1;
                    rec.times.push(state.time);
                    perLine.set(name, rec);
                }
            }
        }

        return [...perLine.entries()]
            .map(([line, rec]) => ({
                line,
                affected: true,
                windowStart: rec.times[0],
                windowEnd: rec.times[rec.times.length - 1],
                hitCount: rec.hit,
            }))
            .sort((a, b) => b.hitCount - a.hitCount);
    }

    /** 台风数据 → 状态数组（新 schema tracks 或旧 schema points 统一转 points → states） */
    private toStates(typhoonData: any): TyphoonStateDto[] {
        let points: any[] = [];
        if (Array.isArray(typhoonData?.tracks)) {
            points = this.windCircle.transformActiveTyphoonToPoints(typhoonData);
        } else if (Array.isArray(typhoonData?.points)) {
            points = typhoonData.points;
        }
        if (!points.length) return [];
        return this.windCircle.transformPointsToStates(points);
    }

    /** 7 级风圈四象限扇形 → turf Polygon[]（wind-circle 输出 [lat, lng] → 转换 [lng, lat]） */
    private windCircleToPolygons(state: TyphoonStateDto): Feature<Polygon>[] {
        const r = state.radius?.[0];
        if (!r || (r.ne === 0 && r.se === 0 && r.sw === 0 && r.nw === 0)) return [];
        const sectors = this.windCircle.getTyphoonCircleFeature(state);
        return sectors
            .filter(ring => ring.length >= 4)
            .map(ring => turf.polygon([ring.map(p => [p[1], p[0]] as [number, number])]));
    }
}
