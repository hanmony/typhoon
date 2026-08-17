import { Injectable, Logger } from "@nestjs/common";
import { TyphoonDutyService } from "src/typhoon/service/typhoon.duty.service";
import { IToolDefinition, IToolExecutor } from "./tool.interface";
import { ToolExecutionResult } from "../domain/agent.types";

@Injectable()
export class GetDutyInfoTool implements IToolExecutor {
    private readonly logger = new Logger(GetDutyInfoTool.name);

    /** 最多返回的已安排值班条目数 */
    private static readonly MAX_ENTRIES = 20;

    public static readonly definition: IToolDefinition = {
        type: "function",
        function: {
            name: "get_duty_info",
            description:
                "查询当前指挥的值班安排（部门、值班人、日期）。当用户询问谁值班、值班表、今天/某天谁值班时使用此工具。仅反映当前指挥的值班数据，无指挥时返回空。",
            parameters: {
                type: "object",
                properties: {
                    date: {
                        type: "string",
                        description: "可选，指定日期（YYYY-MM-DD），只返回该日期的值班安排；不传则返回全部值班日",
                    },
                },
                required: [],
            },
        },
    };

    constructor(private readonly dutyService: TyphoonDutyService) {}

    async execute(args: Record<string, any>): Promise<ToolExecutionResult> {
        try {
            const list = await this.dutyService.list();
            if (!list || list.length === 0) {
                return {
                    success: true,
                    data: JSON.stringify({ message: "当前无指挥，暂无值班安排。" }),
                };
            }

            const date = (args.date as string | undefined)?.trim();
            const filtered = date ? list.filter(d => d.date === date) : list;
            if (filtered.length === 0) {
                return {
                    success: true,
                    data: JSON.stringify({
                        message: `${date} 不在当前指挥的值班日期范围内（${list[0].date} 至 ${list[list.length - 1].date}）。`,
                    }),
                };
            }

            // 按日期分组；只保留已填写值班人的条目，未安排的部门按数量汇总
            const byDate = new Map<string, { department: string; responsible: string }[]>();
            const unfilledByDate = new Map<string, number>();
            for (const d of filtered) {
                if (!byDate.has(d.date)) {
                    byDate.set(d.date, []);
                    unfilledByDate.set(d.date, 0);
                }
                if (d.responsible && d.responsible.trim()) {
                    byDate.get(d.date).push({ department: d.department, responsible: d.responsible.trim() });
                } else {
                    unfilledByDate.set(d.date, unfilledByDate.get(d.date) + 1);
                }
            }

            const dates: Record<string, any>[] = [];
            let total = 0;
            let truncated = false;
            for (const [d, duties] of byDate) {
                if (total >= GetDutyInfoTool.MAX_ENTRIES) {
                    truncated = true;
                    break;
                }
                const room = GetDutyInfoTool.MAX_ENTRIES - total;
                const take = duties.slice(0, room);
                total += take.length;
                if (duties.length > room) {
                    truncated = true;
                }
                dates.push({
                    date: d,
                    duties: take,
                    unfilledCount: unfilledByDate.get(d) ?? 0,
                });
            }

            // 指定单日且该日无人已安排 → 明确告知，避免 LLM 误读
            if (date && total === 0) {
                const unfilled = unfilledByDate.get(date) ?? 0;
                return {
                    success: true,
                    data: JSON.stringify({ message: `${date} 暂未安排值班人（${unfilled} 个部门待安排）。` }),
                };
            }

            return {
                success: true,
                data: JSON.stringify({
                    dates,
                    note:
                        (truncated ? "已安排值班人的条目较多，仅展示前 20 条；" : "") +
                        "unfilledCount 为当日未安排值班人的部门数量，完整值班表可在指挥大屏查看。",
                }),
            };
        } catch (err) {
            this.logger.error(`get_duty_info error: ${(err as Error).message}`);
            return {
                success: false,
                data: JSON.stringify({ error: `查询值班安排失败: ${(err as Error).message}` }),
            };
        }
    }
}
