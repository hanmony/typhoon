import { Injectable, Logger } from "@nestjs/common";
import { AlertService } from "src/typhoon/alert/alert.service";
import { IToolDefinition, IToolExecutor } from "./tool.interface";
import { ToolExecutionResult } from "../domain/agent.types";

@Injectable()
export class GetCurrentStatusTool implements IToolExecutor {
    private readonly logger = new Logger(GetCurrentStatusTool.name);

    public static readonly definition: IToolDefinition = {
        type: "function",
        function: {
            name: "get_current_status",
            description:
                "获取当前防汛状态，包括台风位置、风圈覆盖、告警等级等实时信息。当用户询问台风当前位置、风圈影响、预警信息、天气状况等时使用此工具。",
            parameters: {
                type: "object",
                properties: {},
                required: [],
            },
        },
    };

    constructor(private readonly alertService: AlertService) {}

    async execute(_args: Record<string, any>): Promise<ToolExecutionResult> {
        try {
            const data = await this.alertService.getCurrentAlerts();
            // 为 LLM 提供结构化摘要
            const summary: Record<string, any> = {
                alerts:
                    data.alerts?.map(a => ({
                        type: a.typeLabel,
                        level: a.levelLabel,
                        status: a.status,
                        title: a.title,
                    })) || [],
                typhoon: data.typhoon
                    ? {
                          name: data.typhoon.name,
                          enName: data.typhoon.enName,
                          center: data.typhoon.center,
                          speed: data.typhoon.speed,
                          direction: data.typhoon.direction,
                          strong: data.typhoon.strong,
                          pressure: data.typhoon.pressure,
                          radius7: data.typhoon.radius7,
                          radius10: data.typhoon.radius10,
                          radius12: data.typhoon.radius12,
                      }
                    : null,
                windCircle: data.windCircle
                    ? {
                          isOverlapping: data.windCircle.isOverlapping,
                          center: data.windCircle.center,
                          everOverlapped: data.windCircle.everOverlapped,
                      }
                    : null,
                timeContext: data.timeContext,
                prediction: data.prediction,
            };
            return {
                success: true,
                data: JSON.stringify(summary),
            };
        } catch (err) {
            this.logger.error(`get_current_status error: ${(err as Error).message}`);
            return {
                success: false,
                data: JSON.stringify({ error: `获取当前状态失败: ${(err as Error).message}` }),
            };
        }
    }
}
