import { Injectable, Logger } from "@nestjs/common";
import { IToolDefinition, IToolExecutor } from "./tool.interface";
import { ToolExecutionResult } from "../domain/agent.types";

@Injectable()
export class GetTyphoonHistoryTool implements IToolExecutor {
    private readonly logger = new Logger(GetTyphoonHistoryTool.name);

    public static readonly definition: IToolDefinition = {
        type: "function",
        function: {
            name: "get_typhoon_history",
            description:
                "查询历史台风记录。当用户询问历史台风、往年台风情况、特定台风编号的详细信息时使用此工具。注意：此功能目前为占位实现，返回提示信息。",
            parameters: {
                type: "object",
                properties: {
                    typhoon_id: {
                        type: "string",
                        description: "台风编号（如 202409）",
                    },
                    limit: {
                        type: "number",
                        description: "返回数量限制，默认 5",
                    },
                },
                required: [],
            },
        },
    };

    constructor() {}

    async execute(_args: Record<string, any>): Promise<ToolExecutionResult> {
        // TODO: 待确认 TyphoonService 历史台风查询接口后实现
        this.logger.debug("get_typhoon_history called (placeholder)");
        return {
            success: true,
            data: JSON.stringify({
                message: "历史台风查询功能待实现。目前无法提供历史台风数据，请告知用户此功能尚在开发中。",
                note: "可建议用户通过其他渠道查询历史台风信息。",
            }),
        };
    }
}
