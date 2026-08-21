import { Injectable, OnModuleInit, Logger } from "@nestjs/common";
import * as turf from "@turf/turf";
import { Feature, Polygon, Position } from "geojson";
import * as shapefile from "shapefile";
import * as AdmZip from "adm-zip";
import * as fs from "fs";
import * as path from "path";
import * as os from "os";
import * as dayjs from "dayjs";
import {
    TyphoonRadiusDto,
    TyphoonStateDto,
    PredictionDto,
    PredictionItemDto,
    PredictionSummaryDto,
} from "./dto/alert.dto";

@Injectable()
export class WindCircleService implements OnModuleInit {
    private readonly logger = new Logger(WindCircleService.name);
    private boundaryPolygon: Feature<Polygon> | null = null;

    async onModuleInit() {
        await this.loadBoundary();
    }

    /** 启动时加载上海行政边界 shapefile */
    private async loadBoundary() {
        try {
            const zipPath = path.resolve(process.cwd(), "assets/shape/Shanghai-2020-simple.zip");
            this.logger.log(`加载上海行政边界: ${zipPath}`);
            const zip = new AdmZip(zipPath);

            // 解压到临时目录
            const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "shp-"));
            zip.extractAllTo(tmpDir, true);

            // 找到 .shp 文件
            const shpEntry = zip.getEntries().find((e: any) => e.entryName.endsWith(".shp"));
            if (!shpEntry) throw new Error("zip 中未找到 .shp 文件");
            const shpPath = path.join(tmpDir, shpEntry.entryName);

            // 使用 shapefile 包读取
            const source = await shapefile.open(shpPath);
            const result = await source.read();
            if (result.done) throw new Error("shapefile 为空");

            // 与前端一致：坐标从 [lng, lat] 反转为 [lat, lng]
            const coordinates = (result.value.geometry as any).coordinates.map((c: number[][]) =>
                c.map((p: number[]) => p.slice().reverse()),
            );
            this.boundaryPolygon = turf.polygon(coordinates);
            this.logger.log("上海行政边界加载成功");

            // 关闭 shapefile 读取流，避免 Windows 下文件句柄占用导致目录无法删除
            try {
                if (typeof (source as any).cancel === "function") {
                    await (source as any).cancel();
                }
            } catch {
                // ignore cancel errors
            }
            // 清理临时目录（Windows 下句柄释放有延迟，重试并最终兜底）
            const rmDir = async () => {
                try {
                    fs.rmSync(tmpDir, { recursive: true, force: true });
                } catch {
                    await new Promise(r => setTimeout(r, 300));
                    try {
                        fs.rmSync(tmpDir, { recursive: true, force: true });
                    } catch {
                        this.logger.warn(`临时目录清理失败，已忽略: ${tmpDir}`);
                    }
                }
            };
            await rmDir();
        } catch (error) {
            this.logger.error("上海行政边界加载失败", error);
        }
    }

    getBoundary() {
        return this.boundaryPolygon;
    }

    /** 解析风圈半径字符串 "ne|se|nw|sw" → TyphoonRadiusDto（对应前端 transformTyphoonRadiusToTyphoonRadius） */
    parseRadius(radius: string): TyphoonRadiusDto {
        if (!radius) return { ne: 0, se: 0, sw: 0, nw: 0 };
        const parts = radius.split("|");
        return {
            ne: parseFloat(parts[0]) || 0,
            se: parseFloat(parts[1]) || 0,
            nw: parseFloat(parts[2]) || 0,
            sw: parseFloat(parts[3]) || 0,
        };
    }

    /** 风圈对象 {ne, se, nw, sw} → "ne|se|nw|sw" 字符串（与前端 windRadiusToString 一致；上游供 parseRadius 使用） */
    windRadiusToString(r?: { ne?: number; se?: number; nw?: number; sw?: number }): string {
        if (!r) return "";
        return [r.ne ?? "", r.se ?? "", r.nw ?? "", r.sw ?? ""].join("|");
    }

    /**
     * 实时台风 TyphoonTwoDto → 下游期望的 points 数组（对应前端 transformActiveTyphoonToTyphoonListItem 的 tracks 部分）。
     * 把新 schema（tracks/forecasts/lands + lat/lon/wind_speed/...）映射成旧 schema（points + lng/speed/power/...），
     * 使 transformPointsToStates / transformPointToState 继续按旧契约工作。
     */
    transformActiveTyphoonToPoints(info: any): any[] {
        if (!info || !Array.isArray(info.tracks)) return [];
        const tracks = info.tracks;
        const forecasts: any[] = Array.isArray(info.forecasts) ? info.forecasts : [];
        const lastTrack = tracks[tracks.length - 1];

        return tracks.map((t: any) => {
            const isLast = t === lastTrack;
            const point: Record<string, any> = {
                time: t.data_time,
                lng: t.lon !== undefined ? String(t.lon) : "",
                lat: t.lat !== undefined ? String(t.lat) : "",
                strong: t.level ?? "",
                power: t.wind_class ?? "",
                speed: t.wind_speed !== undefined ? String(t.wind_speed) : "",
                pressure: t.pressure !== undefined ? String(t.pressure) : "",
                movespeed: t.move_sp !== undefined ? String(t.move_sp) : "",
                movedirection: t.move_dir ?? "",
                radius7: this.windRadiusToString(t.radius7),
                radius10: this.windRadiusToString(t.radius10),
                radius12: this.windRadiusToString(t.radius12),
                ckposition: t.ck_position ?? null,
                jl: t.trend ?? null,
                forecast:
                    isLast && forecasts.length
                        ? [
                              {
                                  tm: "中国",
                                  forecastpoints: forecasts.map((f: any) => ({
                                      time: f.data_time,
                                      lng: f.lon !== undefined ? String(f.lon) : "",
                                      lat: f.lat !== undefined ? String(f.lat) : "",
                                      strong: f.level ?? "",
                                      power: f.wind_class ?? "",
                                      speed: f.wind_speed !== undefined ? String(f.wind_speed) : "",
                                      pressure: f.pressure !== undefined ? String(f.pressure) : "",
                                  })),
                              },
                          ]
                        : [],
            };
            return point;
        });
    }

    /** 单个台风点 → TyphoonStateDto（对应前端 transformTyphoonPointToTyphoonState） */
    transformPointToState(point: any, previousPoint?: any): TyphoonStateDto {
        return {
            center: [parseFloat(point.lat), parseFloat(point.lng)],
            lon: parseFloat(point.lng),
            lat: parseFloat(point.lat),
            time: dayjs(point.time).toDate(),
            timeString: point.time,
            speed: parseFloat(point.speed),
            level: parseFloat(point.power),
            strong: point.strong || "",
            centerPressure: parseFloat(point.pressure),
            radius: [
                this.parseRadius(point.radius7 || previousPoint?.radius7 || ""),
                this.parseRadius(point.radius10 || previousPoint?.radius10 || ""),
                this.parseRadius(point.radius12 || previousPoint?.radius12 || ""),
            ],
            info: (point.ckposition && point.ckposition.split(" ").filter(Boolean)[0]) || "",
            power: point.power,
            tendency: point.jl || "",
            direction: point.movedirection,
        };
    }

    /** 批量台风点 → TyphoonStateDto[]（对应前端 transformTyphoonPointsToTyphoonStates） */
    transformPointsToStates(points: any[]): TyphoonStateDto[] {
        const states: TyphoonStateDto[] = [];
        let hasRadiusIndex = -1;
        for (let i = 0; i < points.length; i++) {
            const p = points[i];
            const lastPointHasRadius = points[hasRadiusIndex];
            const state = this.transformPointToState(p, lastPointHasRadius);
            if (p.radius7 || p.radius10 || p.radius12) {
                hasRadiusIndex = i;
            }
            states.push(state);
        }
        return states;
    }

    /** 查找最接近指定时间的台风状态（对应前端 findClosestTyphoonState） */
    findClosestState(time: Date, states: TyphoonStateDto[]): { state: TyphoonStateDto; states: TyphoonStateDto[] } {
        const closestState = states.reduce((prev, current) => {
            return Math.abs(dayjs(current.time).diff(time, "minutes")) <
                Math.abs(dayjs(prev.time).diff(time, "minutes"))
                ? current
                : prev;
        }, states[0]);
        const index = states.findIndex(s => s.time === closestState.time);
        return {
            state: closestState,
            states: states.slice(0, index + 1),
        };
    }

    /** 计算模拟时间（对应前端 simulateCurrentTime getter） */
    calcSimulateTime(simulateStartTime: Date, commandStartTime: Date): Date {
        const duration = Date.now() - commandStartTime.getTime();
        return new Date(simulateStartTime.getTime() + duration);
    }

    /** 获取当前状态（对应前端 getCurrentTyphoonFrame） */
    getCurrentState(typhoonData: any, isSimulated: boolean, queryTime: Date): TyphoonStateDto | null {
        const points = typhoonData?.points;
        if (!points || !points.length) return null;
        if (isSimulated) {
            const states = this.transformPointsToStates(points);
            const { state } = this.findClosestState(queryTime, states);
            return state;
        }
        const lastPoint = points[points.length - 1];
        return this.transformPointToState(lastPoint);
    }

    /** 模拟时间转真实时间（对应前端 transformToRealTime） */
    private transformToRealTime(predict: Date, queryTime: Date): Date {
        // queryTime 既是 commandStartTime 也是 simulateStartTime 的参考点
        // 公式: realTime = queryTime + (predict - queryTime)
        // 即: 在模拟时间轴上的偏移量映射到真实时间轴
        const duration = predict.getTime() - queryTime.getTime();
        return new Date(Date.now() + duration);
    }

    /** 生成扇形坐标（对应前端 generateSector） */
    generateSector(center: number[], radius: number, startAngle: number, endAngle: number, points = 32): number[][] {
        const angleDiff = endAngle > startAngle ? endAngle - startAngle : endAngle + 360 - startAngle;
        const sectorCoords: number[][] = [];

        sectorCoords.push(center);

        for (let i = 0; i <= points; i++) {
            const angle = startAngle + (angleDiff * i) / points;
            const radians = (angle - 90) * (Math.PI / 180);

            const dx = radius * Math.cos(radians);
            const dy = radius * Math.sin(radians);

            const earthRadius = 6378137;
            const deltaLng = (dx / earthRadius) * (180 / Math.PI);
            const deltaLat = (dy / earthRadius) * (180 / Math.PI);

            sectorCoords.push([center[0] + deltaLat, center[1] + deltaLng]);
        }

        sectorCoords.push(center);
        return sectorCoords;
    }

    /** 构建四象限风圈特征；radiusIndex: 0=7级、1=10级、2=12级，默认保持原 7 级契约。 */
    getTyphoonCircleFeature(state: TyphoonStateDto, radiusIndex: 0 | 1 | 2 = 0): number[][][] {
        const centerPoint = state.center.slice();
        const maxRadius = state.radius[radiusIndex] ?? { ne: 0, se: 0, sw: 0, nw: 0 };
        const { ne, se, sw, nw } = maxRadius;
        return [
            this.generateSector(centerPoint, ne * 1000, 90, 180),
            this.generateSector(centerPoint, se * 1000, 0, 90),
            this.generateSector(centerPoint, sw * 1000, 270, 360),
            this.generateSector(centerPoint, nw * 1000, 180, 270),
        ];
    }

    /** 判断风圈是否与上海重叠（对应前端 isTyphoonCircleOverlayShanghai） */
    isOverlappingShanghai(state: TyphoonStateDto): boolean {
        if (!this.boundaryPolygon) return false;
        const sectorCoords = this.getTyphoonCircleFeature(state);
        return sectorCoords.some(coords => {
            const sector = turf.polygon([coords]);
            return (
                turf.booleanOverlap(sector, this.boundaryPolygon) || turf.booleanContains(sector, this.boundaryPolygon)
            );
        });
    }

    // ─── 预测功能 ───────────────────────────────────────────

    /** 获取预测路径（对应前端 getPredictPath） */
    getPredictPath(typhoonData: any, isSimulated: boolean, queryTime: Date): TyphoonStateDto[] {
        if (isSimulated) {
            // 模拟模式：取查询时间之后的点，前面补一个
            const states = this.transformPointsToStates(typhoonData.points);
            this.logger.log(`[getPredictPath] 模拟模式: states=${states.length}, queryTime=${queryTime.toISOString()}`);
            if (states.length) {
                this.logger.log(
                    `[getPredictPath] 首个state时间: ${states[0].time.toISOString()}, 末个: ${states[states.length - 1].time.toISOString()}`,
                );
            }
            const predictStates = states.filter(s => s.time > queryTime);
            this.logger.log(`[getPredictPath] queryTime之后的点: ${predictStates.length}`);
            if (!predictStates.length) return [];
            const firstPredictIndex = states.findIndex(s => s === predictStates[0]);
            const prevState = firstPredictIndex > 0 ? states[firstPredictIndex - 1] : null;
            return prevState ? [prevState, ...predictStates] : predictStates;
        }

        // 实时模式：取最后一个观测点的中国预报
        const points = typhoonData.points;
        if (!points || !points.length) return [];
        const lastPoint = points[points.length - 1];
        if (!lastPoint.forecast || !lastPoint.forecast.length) return [];
        const ourForecast = lastPoint.forecast.find((f: any) => f.tm === "中国");
        if (!ourForecast || !ourForecast.forecastpoints.length) return [];

        // 合并预报点和最后观测点（预报点可能缺少 radius 等字段）
        const mergedPoints = ourForecast.forecastpoints.map((f: any) => ({
            ...lastPoint,
            ...f,
        }));
        return this.transformPointsToStates(mergedPoints);
    }

    /** 预测登陆点（对应前端 findPredictLandingInfo） */
    findPredictLandingInfo(
        typhoonData: any,
        isSimulated: boolean,
        queryTime: Date,
        currentTime: Date,
    ): PredictionItemDto | null {
        const predictPaths = this.getPredictPath(typhoonData, isSimulated, queryTime);
        this.logger.log(
            `[findPredictLandingInfo] predictPaths=${predictPaths.length}, boundary=${!!this.boundaryPolygon}`,
        );
        if (!predictPaths.length || !this.boundaryPolygon) return null;

        // 构建预测路径线（与前端一致：使用 [lat, lng] 格式的 center）
        const trackLine = turf.lineString(predictPaths.map(s => s.center));

        // 计算路径线与上海边界的交点
        const intersects = turf.lineIntersect(trackLine, this.boundaryPolygon);
        this.logger.log(
            `[findPredictLandingInfo] intersects=${intersects.features.length}, predictPaths=${predictPaths.length}`,
        );
        if (!intersects.features.length) return null;

        // 取当前台风位置（第一个预测点 = 最近观测点）
        const currentCenter = predictPaths[0].center;

        // 找最近的交点（交点坐标也是 [lat, lng] 格式，因为边界是 [lat, lng]）
        const closestPoint = this.findClosestPosition(
            currentCenter,
            intersects.features.map(f => f.geometry.coordinates),
        );

        // 找交点所在的线段，插值得到登陆状态
        const landingState = this.findPredictFrame(closestPoint, predictPaths, isSimulated, queryTime);
        if (!landingState) return null;

        const isPast = landingState.time.getTime() < currentTime.getTime();
        return {
            status: isPast ? "past" : "future",
            time: landingState.time.toISOString(),
            point: closestPoint as [number, number], // [lat, lng]
            typhoonState: this.toPredictionSummary(landingState),
        };
    }

    /** 预测风圈首次影响上海的时间（对应前端 findPredictOverlayInfo） */
    findPredictOverlayInfo(
        typhoonData: any,
        isSimulated: boolean,
        queryTime: Date,
        currentTime: Date,
    ): PredictionItemDto | null {
        // 先检查当前状态是否已覆盖上海
        const currentState = this.getCurrentState(typhoonData, isSimulated, queryTime);
        if (currentState && this.isOverlappingShanghai(currentState)) {
            return {
                status: "past",
                time: currentState.time.toISOString(),
                point: null,
                typhoonState: this.toPredictionSummary(currentState),
            };
        }

        const predictPaths = this.getPredictPath(typhoonData, isSimulated, queryTime);
        if (!predictPaths.length) return null;

        // 按 5 分钟插值
        const separatedStates = this.separateStatesByMinutes(predictPaths);
        this.logger.log(
            `[findPredictOverlayInfo] separatedStates=${separatedStates.length}, queryTime=${queryTime.toISOString()}`,
        );

        // 逐帧检查风圈是否与上海重叠
        for (const state of separatedStates) {
            if (this.isOverlappingShanghai(state)) {
                const isPast = state.time.getTime() < currentTime.getTime();
                return {
                    status: isPast ? "past" : "future",
                    time: state.time.toISOString(),
                    point: null,
                    typhoonState: this.toPredictionSummary(state),
                };
            }
        }
        return null;
    }

    /** 生成完整预测信息 */
    getPrediction(typhoonData: any, isSimulated: boolean, queryTime: Date): PredictionDto | null {
        // 模拟模式下用 queryTime 判断时态，实时模式用当前时间
        const currentTime = isSimulated ? queryTime : new Date();
        this.logger.log(
            `[getPrediction] 开始计算预测, isSimulated=${isSimulated}, queryTime=${queryTime.toISOString()}, currentTime=${currentTime.toISOString()}`,
        );
        const landing = this.findPredictLandingInfo(typhoonData, isSimulated, queryTime, currentTime);
        const overlay = this.findPredictOverlayInfo(typhoonData, isSimulated, queryTime, currentTime);
        this.logger.log(`[getPrediction] 结果: landing=${JSON.stringify(landing)}, overlay=${JSON.stringify(overlay)}`);
        if (!landing && !overlay) return null;
        return { landing, overlay };
    }

    // ─── 预测辅助方法 ───────────────────────────────────────

    /** 找最近的点（对应前端 findClosestPoint） */
    private findClosestPosition(target: Position, fromPoints: Position[]): Position {
        const to = turf.point(target);
        return fromPoints.reduce((prev, cur) => {
            return turf.distance(turf.point(prev), to) > turf.distance(turf.point(cur), to) ? cur : prev;
        });
    }

    /** 判断点是否近似在线段上（对应前端 nearBooleanContains） */
    private nearBooleanContains(line: [Position, Position], point: Position): boolean {
        const epsilon = 1e-8;
        const p1 = line[0];
        const p2 = line[1];
        const dx = p2[0] - p1[0];
        const dy = p2[1] - p1[1];
        const l2 = dx * dx + dy * dy;
        if (l2 === 0) {
            return Math.hypot(point[0] - p1[0], point[1] - p1[1]) < epsilon;
        }
        const t = ((point[0] - p1[0]) * dx + (point[1] - p1[1]) * dy) / l2;
        const tClamped = Math.max(0, Math.min(1, t));
        const projX = p1[0] + tClamped * dx;
        const projY = p1[1] + tClamped * dy;
        const distSq = (point[0] - projX) ** 2 + (point[1] - projY) ** 2;
        return distSq < epsilon * epsilon;
    }

    /** 找交点所在的预测路径段，插值得到精确状态（对应前端 findPredictFrame） */
    private findPredictFrame(
        position: Position,
        predictPaths: TyphoonStateDto[],
        isSimulated: boolean = false,
        queryTime?: Date,
    ): TyphoonStateDto | null {
        const turfPoint = turf.point(position);

        for (let i = 1; i < predictPaths.length; i++) {
            const from = predictPaths[i - 1];
            const to = predictPaths[i];

            // 检查交点是否在这段线段上
            if (!this.nearBooleanContains([from.center, to.center], position)) continue;

            // 检查起点是否在上海外部（台风从外向内移动）
            if (this.boundaryPolygon && turf.booleanPointInPolygon(turf.point(from.center), this.boundaryPolygon)) {
                continue;
            }

            // 计算距离百分比
            const fromPoint = turf.point(from.center);
            const toPoint = turf.point(to.center);
            const distancePercentage = turf.distance(turfPoint, fromPoint) / turf.distance(fromPoint, toPoint);

            // 插值得到精确状态
            const frame = this.percentageFrame(from, to, Math.min(distancePercentage, 1));

            // 模拟模式下将台风历史时间映射到命令实际时间（对应前端 transformToRealTimeState）
            if (isSimulated && queryTime) {
                frame.time = this.transformToRealTime(frame.time, queryTime);
                frame.timeString = dayjs(frame.time).format("MM-DD HH:mm");
            }
            return frame;
        }
        return null;
    }

    /** 线性插值两个状态（对应前端 getPercentageFrame） */
    private percentageFrame(from: TyphoonStateDto, to: TyphoonStateDto, percentage: number): TyphoonStateDto {
        const center: [number, number] = [
            from.center[0] + (to.center[0] - from.center[0]) * percentage,
            from.center[1] + (to.center[1] - from.center[1]) * percentage,
        ];
        const predictTime = new Date(from.time.getTime() + (to.time.getTime() - from.time.getTime()) * percentage);
        return {
            center,
            lon: center[1],
            lat: center[0],
            time: predictTime,
            timeString: dayjs(predictTime).format("MM-DD HH:mm"),
            speed: from.speed + (to.speed - from.speed) * percentage,
            level: from.level,
            centerPressure: from.centerPressure + (to.centerPressure - from.centerPressure) * percentage,
            radius: this.percentageRadiusArray(from.radius, to.radius, percentage),
            strong: from.strong,
            tendency: from.tendency,
            direction: from.direction,
            info: from.info,
            power: from.power,
        };
    }

    /** 插值风圈半径数组 */
    private percentageRadiusArray(
        from: TyphoonRadiusDto[],
        to: TyphoonRadiusDto[],
        percentage: number,
    ): TyphoonRadiusDto[] {
        const result: TyphoonRadiusDto[] = [];
        const len = Math.max(from.length, to.length);
        for (let i = 0; i < len; i++) {
            const f = from[i] || { ne: 0, se: 0, sw: 0, nw: 0 };
            const t = to[i] || { ne: 0, se: 0, sw: 0, nw: 0 };
            result.push({
                ne: f.ne + (t.ne - f.ne) * percentage,
                se: f.se + (t.se - f.se) * percentage,
                sw: f.sw + (t.sw - f.sw) * percentage,
                nw: f.nw + (t.nw - f.nw) * percentage,
            });
        }
        return result;
    }

    /** 按分钟间隔插值路径（对应前端 separateStatesByMinutes） */
    private separateStatesByMinutes(states: TyphoonStateDto[], minutes = 5): TyphoonStateDto[] {
        const separated: TyphoonStateDto[] = [];

        for (let i = 1; i < states.length; i++) {
            const from = states[i - 1];
            const to = states[i];
            separated.push(from);

            const diffMs = to.time.getTime() - from.time.getTime();
            const diffMinutes = diffMs / 60000;

            if (diffMinutes > minutes) {
                const pointCount = Math.floor(diffMinutes / minutes) - 1;
                const hasRemainder = diffMinutes % minutes > 0 ? 1 : 0;
                const total = pointCount + hasRemainder;

                for (let j = 1; j <= total; j++) {
                    const curTime = new Date(from.time.getTime() + j * minutes * 60000);
                    if (curTime >= to.time) break;
                    const timePercentage = (curTime.getTime() - from.time.getTime()) / diffMs;
                    separated.push(this.percentageFrame(from, to, timePercentage));
                }
            }

            // 最后一个段的终点
            if (i === states.length - 1) {
                separated.push(to);
            }
        }
        return separated;
    }

    /** TyphoonStateDto → PredictionSummaryDto */
    private toPredictionSummary(state: TyphoonStateDto): PredictionSummaryDto {
        return {
            center: state.center,
            time: state.time.toISOString(),
            speed: state.speed,
            direction: state.direction,
            strong: state.strong,
        };
    }
}
