import { Injectable, Logger } from "@nestjs/common";
import * as dayjs from "dayjs";
import { TyphoonService } from "src/typhoon/service/typhoon.service";
import { TyphoonSevereWeatherNewHistoryDto } from "src/typhoon/domain/typhoon.severe.weather.new.history.dto";
import { IToolDefinition, IToolExecutor } from "./tool.interface";
import { ToolExecutionResult } from "../domain/agent.types";

/** CAP 预警性质代码 → 中文 */
const MESSAGE_TYPE_LABEL: Record<string, string> = {
    new: "发布",
    update: "更新",
    cancel: "解除",
};

/** CAP 严重程度代码 → 预警颜色等级 */
const SEVERITY_LABEL: Record<string, string> = {
    minor: "蓝色",
    moderate: "黄色",
    severe: "橙色",
    extreme: "红色",
};

@Injectable()
export class GetSevereWeatherHistoryTool implements IToolExecutor {
    private readonly logger = new Logger(GetSevereWeatherHistoryTool.name);

    /** 最多返回条数（预警历史通常体量小，此为兜底） */
    private static readonly MAX_ENTRIES = 50;

    public static readonly definition: IToolDefinition = {
        type: "function",
        function: {
            name: "get_severe_weather_history",
            description:
                "查询本次指挥的天气预警历史（预警名称、等级、发布/生效/失效时间、是否已结束）。当用户询问本次指挥发过哪些预警、预警历史、预警时间线时使用此工具。仅反映当前指挥的预警历史，无指挥时返回空。",
            parameters: {
                type: "object",
                properties: {},
                required: [],
            },
        },
    };

    constructor(private readonly typhoonService: TyphoonService) {}

    async execute(_args: Record<string, any>): Promise<ToolExecutionResult> {
        try {
            const list = await this.typhoonService.getSevereWeatherhistory();
            if (!list || list.length === 0) {
                return {
                    success: true,
                    data: JSON.stringify({ message: "当前无指挥或暂无预警历史。" }),
                };
            }

            // 按发布时间升序（预警时间线顺序）
            const sorted = [...list].sort(
                (a, b) => new Date(a.issuedTime).getTime() - new Date(b.issuedTime).getTime(),
            );
            const truncated = sorted.length > GetSevereWeatherHistoryTool.MAX_ENTRIES;
            const shown = sorted.slice(0, GetSevereWeatherHistoryTool.MAX_ENTRIES).map(a => this.summarize(a));

            return {
                success: true,
                data: JSON.stringify({
                    count: shown.length,
                    total: sorted.length,
                    alerts: shown,
                    note: truncated ? `预警共 ${sorted.length} 条，仅展示前 ${shown.length} 条。` : undefined,
                }),
            };
        } catch (err) {
            this.logger.error(`get_severe_weather_history error: ${(err as Error).message}`);
            return {
                success: false,
                data: JSON.stringify({ error: `查询预警历史失败: ${(err as Error).message}` }),
            };
        }
    }

    private summarize(a: TyphoonSevereWeatherNewHistoryDto): Record<string, any> {
        const typeCode = a.messageType?.code || "";
        const typeLabel = MESSAGE_TYPE_LABEL[typeCode] || typeCode;
        const severityLabel = SEVERITY_LABEL[a.severity] || a.severity;
        return {
            weatherId: a.weatherId,
            // 名称优先 headline，其次兼容字段 alertname/title
            name: a.headline || a.alertname || a.title || "",
            eventType: a.eventType?.name || a.eventType?.code || "",
            senderName: a.senderName,
            severity: severityLabel,
            type: typeLabel,
            issuedTime: a.issuedTime ? dayjs(a.issuedTime).format("YYYY-MM-DD HH:mm") : "",
            effectiveTime: a.effectiveTime ? dayjs(a.effectiveTime).format("YYYY-MM-DD HH:mm") : "",
            expireTime: a.expireTime ? dayjs(a.expireTime).format("YYYY-MM-DD HH:mm") : "",
            isEnd: a.isEnd === 1,
            endtime: a.endtime ? dayjs(a.endtime).format("YYYY-MM-DD HH:mm") : "",
        };
    }
}
