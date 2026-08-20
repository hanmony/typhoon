import { Injectable, Logger } from "@nestjs/common";
import { RepoService } from "src/database/service/repo/repo.service";
import { ActionCategory } from "src/database/lib/action.category";
import { CaseStatus } from "src/database/entity/case.schema";
import { ToolExecutionResult } from "../domain/agent.types";
import { IToolDefinition, IToolExecutor } from "./tool.interface";

type StringRecord = Record<string, string>;

@Injectable()
export class GetCaseActionsTool implements IToolExecutor {
    private readonly logger = new Logger(GetCaseActionsTool.name);

    public static readonly definition: IToolDefinition = {
        type: "function",
        function: {
            name: "get_case_actions",
            description:
                "查询历史台风案例中已经实际记录的线路行车措施、区段和精确时间窗。用户询问某个历史案例曾采取何种停运、限速、巡道或交路调整措施时必须使用。历史措施只用于事实回溯，不代表当前应采取同样措施。",
            parameters: {
                type: "object",
                properties: {
                    case_name: {
                        type: "string",
                        description: "历史案例名称，例如灿都、烟花、轩岚诺、贝碧嘉、梅花",
                    },
                    line: {
                        type: "string",
                        description: "可选线路过滤，例如5号线、浦江线",
                    },
                },
                required: ["case_name"],
            },
        },
    };

    constructor(private readonly repo: RepoService) {}

    async execute(args: Record<string, any>): Promise<ToolExecutionResult> {
        const caseName = String(args.case_name || "").trim();
        const line = String(args.line || "").trim();
        if (!caseName) {
            return { success: false, data: JSON.stringify({ error: "缺少必填参数 case_name" }) };
        }

        try {
            const cases = await this.repo.cases.find({ status: CaseStatus.normal }).exec();
            const matchedCases = cases.filter(item => this.matchesCaseName(item.name, caseName));
            if (matchedCases.length === 0) {
                return {
                    success: true,
                    data: JSON.stringify({
                        caseName,
                        count: 0,
                        actions: [],
                        message: "未找到该历史案例，不能据此推测线路措施。",
                    }),
                };
            }

            const actions = await this.repo.actions
                .find({
                    caseId: { $in: matchedCases.map(item => item._id) },
                    category: ActionCategory.driving,
                })
                .sort({ fromDate: 1 })
                .exec();

            const safeActions = actions
                .map(action => this.toSafeAction(action))
                .filter(action => !line || this.matchesLine(action.line, line));

            return {
                success: true,
                data: JSON.stringify({
                    caseName,
                    line: line || undefined,
                    count: safeActions.length,
                    note: "以下是历史案例记录，不是当前运营或停运指令。",
                    actions: safeActions,
                    ...(safeActions.length === 0 ? { message: "该案例下没有符合条件的线路行车措施记录。" } : {}),
                }),
            };
        } catch (err) {
            this.logger.error(`get_case_actions error: ${(err as Error).message}`);
            return {
                success: false,
                data: JSON.stringify({ error: `查询历史线路措施失败: ${(err as Error).message}` }),
            };
        }
    }

    private toSafeAction(action: any): Record<string, string> {
        const items = this.toStringRecord(action.items);
        const startStation = this.pick(items, ["起始车站"]);
        const endStation = this.pick(items, ["终止车站"]);
        const section =
            this.pick(items, ["区段", "区段名称", "影响区段"]) ||
            [startStation, endStation].filter(Boolean).join("至");
        return {
            caseName: String(action.caseName || ""),
            line: this.pick(items, ["线路号", "线路名称", "线路"]),
            section,
            direction: this.pick(items, ["上下行", "方向"]),
            measure: this.pick(items, ["行车措施", "调整内容", "措施"]),
            startTime: this.pick(items, ["开始时间"]) || this.formatDate(action.fromDate),
            endTime: this.pick(items, ["结束时间"]) || this.formatDate(action.toDate),
            remark: this.pick(items, ["备注", "说明"]),
        };
    }

    private toStringRecord(value: unknown): StringRecord {
        if (!value) return {};
        if (value instanceof Map) return Object.fromEntries(value.entries()) as StringRecord;
        if (typeof (value as any).toObject === "function") return (value as any).toObject();
        if (typeof value === "object") return value as StringRecord;
        return {};
    }

    private pick(items: StringRecord, keys: string[]): string {
        for (const key of keys) {
            const value = items[key];
            if (value !== undefined && value !== null && String(value).trim()) return String(value).trim();
        }
        return "";
    }

    private matchesCaseName(stored: string, requested: string): boolean {
        const left = this.normalize(stored);
        const right = this.normalize(requested);
        return left === right || left.includes(right) || right.includes(left);
    }

    private matchesLine(stored: string, requested: string): boolean {
        const left = this.normalize(stored);
        const right = this.normalize(requested);
        return left === right || left.includes(right) || right.includes(left);
    }

    private normalize(value: string): string {
        return String(value || "").replace(/\s+/g, "").toLowerCase();
    }

    private formatDate(value: unknown): string {
        if (!value) return "";
        const date = value instanceof Date ? value : new Date(String(value));
        if (Number.isNaN(date.getTime()) || date.getFullYear() >= 3000) return "";
        return date.toISOString();
    }
}
