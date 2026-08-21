import { Injectable, Logger, OnModuleInit } from "@nestjs/common";
import * as fs from "fs";
import * as path from "path";
import * as turf from "@turf/turf";
import { Feature, MultiPolygon, Polygon } from "geojson";
import { WindCircleService } from "src/typhoon/alert/wind-circle.service";
import { TyphoonStateDto } from "src/typhoon/alert/dto/alert.dto";

/** 0=7 级、1=10 级、2=12 级。 */
export type WindCircleRadiusIndex = 0 | 1 | 2;
export type WindCircleLevel = 7 | 10 | 12;

export interface LineImpactOptions {
    /** 默认使用覆盖范围最广的 7 级风圈。 */
    radiusIndex?: WindCircleRadiusIndex;
    /** 仅统计该时刻（含）之后的状态；输入需包含未来轨迹/预报点。 */
    fromTime?: Date;
    /** 仅统计该时刻（含）之前的状态。 */
    toTime?: Date;
}

export interface LineImpactResult {
    /** 线路名称（如“1号线”“机场联络线”）。 */
    line: string;
    affected: boolean;
    /** 首次、末次相交轨迹状态的时间。 */
    windowStart?: Date;
    windowEnd?: Date;
    /** 相交轨迹状态数；是持续性参考，不是风险等级。 */
    hitCount: number;
    /** 本次判定使用的风圈等级。 */
    windLevel: WindCircleLevel;
}

const WIND_LEVEL_BY_RADIUS_INDEX: Record<WindCircleRadiusIndex, WindCircleLevel> = {
    0: 7,
    1: 10,
    2: 12,
};

/** 实施计划约定的线路走廊半宽近似值（Turf buffer 半径）。 */
const LINE_BUFFER_KM = 0.5;

/**
 * M4 步骤 16：台风风圈与地铁线路空间相交研判。
 *
 * 线路资产已经应用前端坐标偏移，本服务只把 `{lng,lat}` 转为 Turf 的
 * `[lng,lat]`，不得再做第二次偏移。每条线路保留支线并构造 MultiLineString，
 * 再按计划外扩 500m 形成线路走廊。风圈服务返回 `[lat,lng]`，进入 Turf 前反转。
 */
@Injectable()
export class LineImpactService implements OnModuleInit {
    private readonly logger = new Logger(LineImpactService.name);
    /** lineName → 多段/支线，每段为 Turf 标准 [lng,lat][]。 */
    private lineStrings: Record<string, number[][][]> = {};
    private lineCorridors: Record<string, Feature<Polygon | MultiPolygon>> = {};

    constructor(private readonly windCircle: WindCircleService) {}

    async onModuleInit() {
        const assetPath = path.resolve(process.cwd(), "assets/line/metro-2026.json");
        if (!fs.existsSync(assetPath)) {
            this.logger.warn("assets/line/metro-2026.json 不存在，线路空间研判不可用；请检查生产 assets 打包");
            return;
        }
        const asset = JSON.parse(fs.readFileSync(assetPath, "utf8"));
        const rawLineStrings = asset.lineStrings;
        if (!rawLineStrings || typeof rawLineStrings !== "object") {
            throw new Error("metro-2026.json 缺少 lineStrings 字段");
        }

        // 先完整校验到局部变量，避免初始化失败后留下半套资产。
        const loadedLineStrings: Record<string, number[][][]> = {};
        const loadedCorridors: Record<string, Feature<Polygon | MultiPolygon>> = {};
        for (const [name, segments] of Object.entries(rawLineStrings)) {
            if (!Array.isArray(segments) || !segments.length) {
                throw new Error(`metro-2026.json 线路 ${name} 没有有效线段`);
            }
            const parsedSegments = segments.map((segment: any, segmentIndex: number) => {
                if (!Array.isArray(segment) || segment.length < 2) {
                    throw new Error(`metro-2026.json 线路 ${name} 第 ${segmentIndex + 1} 段少于 2 个点`);
                }
                return segment.map((point: any, pointIndex: number) => {
                    const lng = Number(point?.lng);
                    const lat = Number(point?.lat);
                    if (!Number.isFinite(lng) || !Number.isFinite(lat)) {
                        throw new Error(
                            `metro-2026.json 线路 ${name} 第 ${segmentIndex + 1} 段第 ${pointIndex + 1} 点坐标无效`,
                        );
                    }
                    return [lng, lat] as [number, number];
                });
            });
            loadedLineStrings[name] = parsedSegments;
            loadedCorridors[name] = this.buildCorridor(name, parsedSegments);
        }
        this.lineStrings = loadedLineStrings;
        this.lineCorridors = loadedCorridors;

        const segmentCount = Object.values(this.lineStrings).reduce((sum, segments) => sum + segments.length, 0);
        this.logger.log(`线路资产已加载：${Object.keys(this.lineStrings).length} 条线 / ${segmentCount} 段`);
    }

    getLoadedLines(): string[] {
        return Object.keys(this.lineStrings);
    }

    /**
     * @returns 受影响线路，按命中状态数降序；默认按 7 级风圈统计全轨迹。
     */
    analyze(typhoonData: any, options: LineImpactOptions = {}): LineImpactResult[] {
        return this.analyzeStates(this.toStates(typhoonData), options);
    }

    /**
     * 直接分析已经转换好的状态。步骤 17 在实时模式下应把 getPredictPath() 的
     * 预报状态传入这里；仅对历史 tracks 使用 fromTime 不会凭空产生未来轨迹。
     */
    analyzeStates(inputStates: TyphoonStateDto[], options: LineImpactOptions = {}): LineImpactResult[] {
        if (!Object.keys(this.lineStrings).length) return [];
        const radiusIndex = options.radiusIndex ?? 0;
        if (!(radiusIndex in WIND_LEVEL_BY_RADIUS_INDEX)) {
            throw new RangeError(`radiusIndex 必须是 0、1 或 2，当前为 ${radiusIndex}`);
        }
        const fromMs = this.toBoundaryMs(options.fromTime, "fromTime");
        const toMs = this.toBoundaryMs(options.toTime, "toTime");
        if (fromMs !== undefined && toMs !== undefined && fromMs > toMs) {
            throw new RangeError("fromTime 不能晚于 toTime");
        }

        // 输入不保证按时间排列；先过滤坏点、限定时段，再排序，时间窗口才可信。
        const states = inputStates
            .filter(state => {
                const timeMs = state.time?.getTime();
                return (
                    Number.isFinite(timeMs) &&
                    Number.isFinite(state.center?.[0]) &&
                    Number.isFinite(state.center?.[1]) &&
                    (fromMs === undefined || timeMs >= fromMs) &&
                    (toMs === undefined || timeMs <= toMs)
                );
            })
            .sort((a, b) => a.time.getTime() - b.time.getTime());
        if (!states.length) return [];

        const perLine = new Map<string, { hit: number; times: Date[] }>();
        for (const state of states) {
            const polygons = this.windCircleToPolygons(state, radiusIndex);
            if (!polygons.length) continue;
            for (const [name, segments] of Object.entries(this.lineStrings)) {
                // 测试或热替换资产时允许惰性构造；正常启动已在 onModuleInit 预构造。
                const corridor = this.lineCorridors[name] ?? this.buildCorridor(name, segments);
                const hit = polygons.some(polygon => turf.booleanIntersects(polygon, corridor));
                if (!hit) continue;
                const record = perLine.get(name) ?? { hit: 0, times: [] };
                record.hit += 1;
                record.times.push(state.time);
                perLine.set(name, record);
            }
        }

        return [...perLine.entries()]
            .map(([line, record]) => ({
                line,
                affected: true,
                windowStart: record.times[0],
                windowEnd: record.times[record.times.length - 1],
                hitCount: record.hit,
                windLevel: WIND_LEVEL_BY_RADIUS_INDEX[radiusIndex],
            }))
            .sort((a, b) => b.hitCount - a.hitCount || a.line.localeCompare(b.line, "zh-CN"));
    }

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

    /** 只为半径大于 0 的象限建面，避免零半径退化多边形参与误判。 */
    private windCircleToPolygons(state: TyphoonStateDto, radiusIndex: WindCircleRadiusIndex): Feature<Polygon>[] {
        const radius = state.radius?.[radiusIndex];
        if (!radius) return [];
        const quadrantRadii = [radius.ne, radius.se, radius.sw, radius.nw];
        const sectors = this.windCircle.getTyphoonCircleFeature(state, radiusIndex);
        return sectors
            .filter(
                (ring, index) => Number.isFinite(quadrantRadii[index]) && quadrantRadii[index] > 0 && ring.length >= 4,
            )
            .map(ring => turf.polygon([ring.map(point => [point[1], point[0]] as [number, number])]));
    }

    private buildCorridor(name: string, segments: number[][][]): Feature<Polygon | MultiPolygon> {
        const corridor = turf.buffer(turf.multiLineString(segments), LINE_BUFFER_KM, { units: "kilometers" });
        if (!corridor) throw new Error(`线路 ${name} 无法生成 ${LINE_BUFFER_KM}km 缓冲带`);
        return corridor;
    }

    private toBoundaryMs(value: Date | undefined, name: string): number | undefined {
        if (value === undefined) return undefined;
        const ms = value.getTime();
        if (!Number.isFinite(ms)) throw new RangeError(`${name} 必须是有效时间`);
        return ms;
    }
}
