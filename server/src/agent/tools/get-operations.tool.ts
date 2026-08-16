import { Injectable, Logger } from "@nestjs/common";
import { TyphoonExtremeEventService } from "src/typhoon/service/typhoon.extreme.event.service";
import { TyphoonExtremeOperationService } from "src/typhoon/service/typhoon.extreme.operation.service";
import { IToolDefinition, IToolExecutor } from "./tool.interface";
import { ToolExecutionResult } from "../domain/agent.types";

@Injectable()
export class GetOperationsTool implements IToolExecutor {
    private readonly logger = new Logger(GetOperationsTool.name);

    public static readonly definition: IToolDefinition = {
        type: "function",
        function: {
            name: "get_operations",
            description:
                "获取防汛运营事件和调度指令。当用户询问当前活跃的事件、运营调整、指挥调度情况时使用此工具。active_only=true 只返回进行中的事件，active_only=false 返回全部历史记录。",
            parameters: {
                type: "object",
                properties: {
                    active_only: {
                        type: "boolean",
                        description: "是否只返回进行中的事件，默认 true",
                    },
                },
                required: [],
            },
        },
    };

    constructor(
        private readonly eventService: TyphoonExtremeEventService,
        private readonly operationService: TyphoonExtremeOperationService,
    ) {}

    async execute(args: Record<string, any>): Promise<ToolExecutionResult> {
        const activeOnly = args.active_only !== false; // 默认 true

        try {
            const [events, operations] = await Promise.all([
                activeOnly ? this.eventService.getActive() : this.eventService.getAll(),
                activeOnly ? this.operationService.getActive() : this.operationService.getAll(),
            ]);

            const summary = {
                activeOnly,
                events: events.map(e => ({
                    line: e.line,
                    description: e.description,
                    eventType: e.eventType,
                    severity: e.severity,
                    startTime: e.startTime,
                    endTime: e.endTime,
                    status: e.terminated === 0 ? "进行中" : "已结束",
                    customPosition: e.customPosition,
                })),
                operations: operations.map(o => ({
                    line: o.line,
                    actionType: o.actionType,
                    description: o.description,
                    startTime: o.startTime,
                    endTime: o.endTime,
                    customPosition: o.customPosition,
                })),
                eventCount: events.length,
                operationCount: operations.length,
            };

            return {
                success: true,
                data: JSON.stringify(summary),
            };
        } catch (err) {
            this.logger.error(`get_operations error: ${(err as Error).message}`);
            return {
                success: false,
                data: JSON.stringify({ error: `获取运营事件失败: ${(err as Error).message}` }),
            };
        }
    }
}
