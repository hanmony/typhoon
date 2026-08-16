import { Injectable, Logger } from "@nestjs/common";
import { RepoService } from "src/database/service/repo/repo.service";
import { TyphoonCommandService } from "../service/typhoon.command.service";
import { TyphoonService } from "../service/typhoon.service";
import { WindCircleService } from "./wind-circle.service";
import {
    AlertCurrentResponseDto,
    AlertItemDto,
    AlertLevel,
    PredictionDto,
    TimeContextDto,
    TyphoonInfoDto,
    TyphoonStateDto,
    WEATHER_TYPE_MAP,
    WindCircleStatusDto,
} from "./dto/alert.dto";
import { getDummyTyphoonSource } from "src/dummy/typhoon.source";

@Injectable()
export class AlertService {
    private readonly logger = new Logger(AlertService.name);

    constructor(
        private readonly repo: RepoService,
        private readonly typhoonCommand: TyphoonCommandService,
        private readonly typhoonService: TyphoonService,
        private readonly windCircleService: WindCircleService,
    ) {}

    /** 获取当前告警状态（主方法） */
    async getCurrentAlerts(): Promise<AlertCurrentResponseDto> {
        const response = new AlertCurrentResponseDto();

        // 1. 获取当前活跃指挥记录
        const command = await this.typhoonCommand.getCurrentCommand();
        if (!command) {
            response.timeContext = {
                queryTime: new Date().toISOString(),
                isSimulation: false,
                simulateStartTime: null,
                commandStartTime: "",
                windCircleClearedShanghai: false,
            };
            return response;
        }

        const isSimulated = command.isSimulated === 1;
        const commandStartTime = command.startTime;
        const simulateStartTime = command.simulateStartTime || null;

        // 2. 确定查询时间
        const queryTime =
            isSimulated && simulateStartTime
                ? this.windCircleService.calcSimulateTime(simulateStartTime, commandStartTime)
                : new Date();

        // 3. 获取天气预警数据
        const alerts = await this.getAlerts(queryTime);

        // 4. 获取台风数据和风圈状态
        const { typhoon, windCircle, typhoonState, typhoonRawData } = await this.getTyphoonAndWindCircle(
            command.name,
            isSimulated,
            queryTime,
            commandStartTime,
            simulateStartTime,
        );

        // 5. 获取预测信息
        let prediction: PredictionDto | null = null;
        if (typhoonRawData) {
            prediction = this.windCircleService.getPrediction(typhoonRawData, isSimulated, queryTime);
        }

        // 6. 组装响应
        response.alerts = alerts;
        response.typhoon = typhoon;
        response.windCircle = windCircle;

        // 检测风圈是否已离开上海：当前未重叠 且 历史曾重叠
        const windCircleClearedShanghai = isSimulated && !windCircle.isOverlapping && windCircle.everOverlapped;

        response.timeContext = {
            queryTime: queryTime.toISOString(),
            isSimulation: isSimulated,
            simulateStartTime: simulateStartTime ? simulateStartTime.toISOString() : null,
            commandStartTime: commandStartTime.toISOString(),
            windCircleClearedShanghai,
        };
        response.prediction = prediction;

        return response;
    }

    /** 获取当前生效的告警列表 */
    private async getAlerts(queryTime: Date): Promise<AlertItemDto[]> {
        try {
            const severeWeatherList = await this.typhoonService.getSevereWeather();
            if (!Array.isArray(severeWeatherList) || severeWeatherList.length === 0) {
                return [];
            }

            const alerts: AlertItemDto[] = [];
            for (const sw of severeWeatherList) {
                const type = this.getWeatherType(sw.alertname);
                const level = this.getWeatherColor(sw.alertlevel);
                const isLifted = sw.warningstate === "解除";

                alerts.push({
                    type,
                    typeLabel: sw.alertname || "",
                    level,
                    levelLabel: sw.alertlevel || "",
                    title: sw.title || `${sw.alertname}${sw.alertlevel}预警`,
                    status: isLifted ? "lifted" : "active",
                    issuedAt: sw.publishtime || "",
                    liftedAt: isLifted ? sw.publishtime : null,
                    defenseGuideline: sw.defenseguideline || "",
                });
            }

            // 按优先级排序：红 > 橙 > 黄 > 蓝
            const levelOrder: Record<AlertLevel, number> = {
                red: 0,
                orange: 1,
                yellow: 2,
                blue: 3,
                lift: 4,
                unknown: 5,
            };
            alerts.sort((a, b) => (levelOrder[a.level] ?? 5) - (levelOrder[b.level] ?? 5));

            return alerts;
        } catch (error) {
            this.logger.error("获取告警数据失败", error);
            return [];
        }
    }

    /** 获取台风信息和风圈状态 */
    private async getTyphoonAndWindCircle(
        typhoonName: string,
        isSimulated: boolean,
        queryTime: Date,
        commandStartTime: Date,
        simulateStartTime: Date | null,
    ): Promise<{
        typhoon: TyphoonInfoDto | null;
        windCircle: WindCircleStatusDto;
        typhoonState: TyphoonStateDto | null;
        typhoonRawData: any | null;
    }> {
        const emptyResult = {
            typhoon: null,
            windCircle: new WindCircleStatusDto(),
            typhoonState: null,
            typhoonRawData: null,
        };

        try {
            let typhoonData: any = null;

            if (isSimulated) {
                // 模拟模式：从 dummy 数据获取（本身就是旧 schema）
                typhoonData = getDummyTyphoonSource(typhoonName);
            } else {
                // 实时模式：从外部 API 获取 TyphoonTwoDto（新 schema），转成下游期望的 points
                const activityList = await this.typhoonService.getActivity();
                const found = activityList?.find((t: any) => t.name === typhoonName) || null;
                if (!found) {
                    return emptyResult;
                }
                const points = this.windCircleService.transformActiveTyphoonToPoints(found);
                if (points.length === 0) {
                    return emptyResult;
                }
                // 仅 points 是下游需要的；保留原对象方便日志/未来扩展
                typhoonData = { ...found, points };
            }

            if (!typhoonData || !typhoonData.points || typhoonData.points.length === 0) {
                return emptyResult;
            }

            // 转换为状态数组
            const states = this.windCircleService.transformPointsToStates(typhoonData.points);

            // 查找最接近查询时间的状态
            const { state: closestState, states: historicalStates } = this.windCircleService.findClosestState(
                queryTime,
                states,
            );

            // 风圈重叠判断
            const isOverlapping = this.windCircleService.isOverlappingShanghai(closestState);

            // 检查历史路径中风圈是否曾经与上海重叠
            const everOverlapped = historicalStates.some(s => this.windCircleService.isOverlappingShanghai(s));

            // 组装台风信息
            const typhoonInfo: TyphoonInfoDto = {
                name: typhoonData.name || "",
                enName: typhoonData.enname || "",
                center: closestState.center,
                speed: closestState.speed,
                direction: closestState.direction || "",
                strong: closestState.strong || "",
                pressure: closestState.centerPressure,
                radius7: closestState.radius[0] || { ne: 0, se: 0, sw: 0, nw: 0 },
                radius10: closestState.radius[1] || { ne: 0, se: 0, sw: 0, nw: 0 },
                radius12: closestState.radius[2] || { ne: 0, se: 0, sw: 0, nw: 0 },
                tendency: closestState.tendency || "",
            };

            const windCircleStatus: WindCircleStatusDto = {
                isOverlapping,
                center: closestState.center,
                everOverlapped,
            };

            return {
                typhoon: typhoonInfo,
                windCircle: windCircleStatus,
                typhoonState: closestState,
                typhoonRawData: typhoonData,
            };
        } catch (error) {
            this.logger.error("获取台风数据失败", error);
            return emptyResult;
        }
    }

    /** 预警等级→颜色标识（对应前端 UtilsService.getWeatherColor） */
    getWeatherColor(alertLevel: string): AlertLevel {
        if (!alertLevel) return "unknown";
        if (alertLevel.indexOf("蓝色") !== -1) return "blue";
        if (alertLevel.indexOf("黄色") !== -1) return "yellow";
        if (alertLevel.indexOf("橙色") !== -1) return "orange";
        if (alertLevel.indexOf("红色") !== -1) return "red";
        if (alertLevel.indexOf("解除") !== -1) return "lift";
        return "unknown";
    }

    /** 天气类型→英文标识（对应前端 UtilsService.getWeatherType） */
    getWeatherType(alertName: string): string {
        if (!alertName) return "unknown";
        return WEATHER_TYPE_MAP[alertName] || "unknown";
    }

    // TODO: LineImpactService — 逐条线路影响判断（见 docs/design/AI告警增强方案.md 第四节）
    // TODO: AlertAnalyzerService — AI 增强分析，含 LLM 解读 + RAG 应急建议 + 历史相似台风（见 docs/design/AI告警增强方案.md 第六节）
    // TODO: NotificationService — 告警分级联动推送 WebSocket/COCC/PAD（见 docs/design/AI告警增强方案.md 第七节）
    // TODO: 告警历史记录持久化
    // findPredictLandingInfo / findPredictOverlayInfo — 已实现，见 WindCircleService.getPrediction()
}
