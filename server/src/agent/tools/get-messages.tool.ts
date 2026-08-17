import { Injectable, Logger } from "@nestjs/common";
import dayjs from "dayjs";
import { TyphoonExtremeMessageService } from "src/typhoon/service/typhoon.extreme.message.service";
import { IToolDefinition, IToolExecutor } from "./tool.interface";
import { ToolExecutionResult } from "../domain/agent.types";

@Injectable()
export class GetMessagesTool implements IToolExecutor {
    private readonly logger = new Logger(GetMessagesTool.name);

    /** 默认返回条数 */
    private static readonly DEFAULT_LIMIT = 10;
    /** 最大返回条数 */
    private static readonly MAX_LIMIT = 20;
    /** 消息内容最大长度（超出截断） */
    private static readonly CONTENT_MAX = 200;

    public static readonly definition: IToolDefinition = {
        type: "function",
        function: {
            name: "get_messages",
            description:
                "查询当前指挥的指挥消息（标题、内容、类型、相关线路、发布时间）。当用户询问最新消息、通知、通报、有什么消息时使用此工具。仅反映当前指挥的消息，无指挥时返回空。",
            parameters: {
                type: "object",
                properties: {
                    limit: {
                        type: "number",
                        description: `可选，返回消息条数上限，默认 ${GetMessagesTool.DEFAULT_LIMIT}，最大 ${GetMessagesTool.MAX_LIMIT}`,
                    },
                },
                required: [],
            },
        },
    };

    constructor(private readonly messageService: TyphoonExtremeMessageService) {}

    async execute(args: Record<string, any>): Promise<ToolExecutionResult> {
        try {
            const list = await this.messageService.getAll();
            if (!list || list.length === 0) {
                return {
                    success: true,
                    data: JSON.stringify({ message: "当前无指挥或暂无指挥消息。" }),
                };
            }

            // limit 规范化：默认 10，限制在 [1, 20]
            const limitRaw = Number(args.limit);
            const limit = Number.isNaN(limitRaw)
                ? GetMessagesTool.DEFAULT_LIMIT
                : Math.min(Math.max(Math.floor(limitRaw), 1), GetMessagesTool.MAX_LIMIT);

            const shown = list.slice(0, limit).map(m => ({
                id: m.id,
                title: m.title,
                type: m.type,
                content:
                    (m.content || "").length > GetMessagesTool.CONTENT_MAX
                        ? `${(m.content || "").slice(0, GetMessagesTool.CONTENT_MAX)}…（内容已截断）`
                        : m.content || "",
                lines: m.lines || [],
                createTime: m.createTime ? dayjs(m.createTime).format("YYYY-MM-DD HH:mm") : "",
            }));

            return {
                success: true,
                data: JSON.stringify({
                    count: shown.length,
                    total: list.length,
                    messages: shown,
                    note:
                        list.length > shown.length
                            ? `消息按发布时间倒序，共 ${list.length} 条，仅展示前 ${shown.length} 条，完整消息列表可在指挥大屏查看。`
                            : "消息按发布时间倒序。",
                }),
            };
        } catch (err) {
            this.logger.error(`get_messages error: ${(err as Error).message}`);
            return {
                success: false,
                data: JSON.stringify({ error: `查询指挥消息失败: ${(err as Error).message}` }),
            };
        }
    }
}
