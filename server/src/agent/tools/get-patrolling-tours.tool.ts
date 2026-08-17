import { Injectable, Logger } from "@nestjs/common";
import * as dayjs from "dayjs";
import { TyphoonPatrollingService } from "src/typhoon/service/typhoon.extreme.patrolling.service";
import { TyphoonPatrollingTourDto } from "src/typhoon/domain/typhoon.extreme.patrolling.dto";
import { IToolDefinition, IToolExecutor } from "./tool.interface";
import { ToolExecutionResult } from "../domain/agent.types";

@Injectable()
export class GetPatrollingToursTool implements IToolExecutor {
    private readonly logger = new Logger(GetPatrollingToursTool.name);

    /** 最多返回的巡道记录条数 */
    private static readonly MAX_ENTRIES = 10;

    public static readonly definition: IToolDefinition = {
        type: "function",
        function: {
            name: "get_patrolling_tours",
            description:
                "查询当前指挥的巡道记录（线路、区段、开始时间、速度）。当用户询问巡道情况、巡道记录、哪条线巡道了时使用此工具。仅反映当前指挥的巡道数据，无指挥时返回空。",
            parameters: {
                type: "object",
                properties: {
                    line: {
                        type: "string",
                        description: "可选，按线路过滤，如「2号线」，只返回该线路的巡道记录；不传则返回全部线路",
                    },
                },
                required: [],
            },
        },
    };

    constructor(private readonly patrollingService: TyphoonPatrollingService) {}

    async execute(args: Record<string, any>): Promise<ToolExecutionResult> {
        try {
            let list: TyphoonPatrollingTourDto[];
            try {
                list = await this.patrollingService.getTours();
            } catch (err) {
                // 只把明确的“无当前指挥”识别为空数据；数据库等异常必须继续上抛。
                if ((err as Error).message.includes("当前指挥已结束")) {
                    return {
                        success: true,
                        data: JSON.stringify({ message: "当前无指挥（指挥已结束），暂无巡道记录。" }),
                    };
                }
                throw err;
            }
            if (!list || list.length === 0) {
                return {
                    success: true,
                    data: JSON.stringify({ message: "当前指挥暂无巡道记录。" }),
                };
            }

            const line = (args.line as string | undefined)?.trim();
            let filtered = list;
            if (line) {
                filtered = list.filter(t => t.line === line);
                if (filtered.length === 0) {
                    filtered = list.filter(t => (t.line || "").includes(line));
                }
                if (filtered.length === 0) {
                    const availableLines = [...new Set(list.map(t => t.line))].join("、");
                    return {
                        success: true,
                        data: JSON.stringify({
                            message: `未找到线路「${line}」的巡道记录。当前有巡道记录的线路：${availableLines || "无"}。`,
                        }),
                    };
                }
            }

            // 按线路分组（保持 service 的 line 倒序、序号升序）
            const byLine = new Map<string, Record<string, any>[]>();
            for (const t of filtered) {
                if (!byLine.has(t.line)) {
                    byLine.set(t.line, []);
                }
                byLine.get(t.line).push({
                    serialNumber: t.serialNumber,
                    identifiers: t.identifiers || [],
                    startTime: t.startTime ? dayjs(t.startTime).format("YYYY-MM-DD HH:mm") : "",
                    speed: t.speed,
                });
            }

            const tours: Record<string, any>[] = [];
            let total = 0;
            let truncated = false;
            for (const [l, items] of byLine) {
                const room = GetPatrollingToursTool.MAX_ENTRIES - total;
                if (room <= 0) {
                    truncated = true;
                    break;
                }
                const take = items.slice(0, room);
                total += take.length;
                if (items.length > room) {
                    truncated = true;
                }
                tours.push({ line: l, tours: take });
            }

            return {
                success: true,
                data: JSON.stringify({
                    lineCount: tours.length,
                    total: filtered.length,
                    tours,
                    note: truncated
                        ? `巡道记录较多，仅展示前 ${GetPatrollingToursTool.MAX_ENTRIES} 条，完整记录可在指挥大屏查看。`
                        : undefined,
                }),
            };
        } catch (err) {
            this.logger.error(`get_patrolling_tours error: ${(err as Error).message}`);
            return {
                success: false,
                data: JSON.stringify({ error: `查询巡道记录失败: ${(err as Error).message}` }),
            };
        }
    }
}
