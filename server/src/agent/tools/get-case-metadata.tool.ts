import { Injectable, Logger } from "@nestjs/common";
import { RepoService } from "src/database/service/repo/repo.service";
import { CaseStatus } from "src/database/entity/case.schema";
import { ToolExecutionResult } from "../domain/agent.types";
import { IToolDefinition, IToolExecutor } from "./tool.interface";

const STANDARD_CASE_NAMES = ["灿都", "烟花", "轩岚诺", "贝碧嘉", "梅花"];
const SAFE_METADATA_FIELDS = [
    "台风年度",
    "台风命名",
    "台风编号",
    "英文名称",
    "台风类型",
    "台风走向",
    "台风最大风力",
    "影响上海时长",
    "台风最大预警等级",
    "影响线路",
    "停运线路数",
];

@Injectable()
export class GetCaseMetadataTool implements IToolExecutor {
    private readonly logger = new Logger(GetCaseMetadataTool.name);

    public static readonly definition: IToolDefinition = {
        type: "function",
        function: {
            name: "get_case_metadata",
            description:
                "查询并比较历史台风案例的安全元数据，包括年度、类型、走向、最大风力、影响时长、最高预警和停运线路数。用户要求在灿都、烟花、轩岚诺、贝碧嘉、梅花五案例中筛选或比较时必须使用。本工具不是轨迹相似度计算。",
            parameters: {
                type: "object",
                properties: {
                    case_names: {
                        type: "array",
                        items: { type: "string" },
                        description: "可选案例名列表；省略时返回灿都、烟花、轩岚诺、贝碧嘉、梅花五个标准案例",
                    },
                },
                required: [],
            },
        },
    };

    constructor(private readonly repo: RepoService) {}

    async execute(args: Record<string, any>): Promise<ToolExecutionResult> {
        const requested = this.parseRequestedNames(args.case_names);
        try {
            const cases = await this.repo.cases.find({ status: CaseStatus.normal }).exec();
            const selected = requested
                .map(name => cases.find(item => this.matchesCaseName(item.name, name)))
                .filter((item, index, all) => item && all.findIndex(candidate => candidate?._id?.toString() === item._id?.toString()) === index);

            const results = selected.map(item => ({
                caseName: item.name,
                metadata: this.pickSafeMetadata(item.values),
            }));

            return {
                success: true,
                data: JSON.stringify({
                    requestedCases: requested,
                    count: results.length,
                    note: "仅返回案例安全元数据；比较结论不得直接作为当前运营决策。",
                    cases: results,
                    ...(results.length === 0 ? { message: "未找到符合条件的正常案例。" } : {}),
                }),
            };
        } catch (err) {
            this.logger.error(`get_case_metadata error: ${(err as Error).message}`);
            return {
                success: false,
                data: JSON.stringify({ error: `查询案例元数据失败: ${(err as Error).message}` }),
            };
        }
    }

    private parseRequestedNames(value: unknown): string[] {
        if (!Array.isArray(value)) return [...STANDARD_CASE_NAMES];
        const names = value.map(item => String(item || "").trim()).filter(Boolean);
        return names.length > 0 ? [...new Set(names)] : [...STANDARD_CASE_NAMES];
    }

    private pickSafeMetadata(rawValues: unknown): Record<string, string> {
        const values = this.toRecord(rawValues);
        const safe: Record<string, string> = {};
        for (const key of SAFE_METADATA_FIELDS) {
            const raw = values[key];
            const value = raw && typeof raw === "object" && "value" in raw ? (raw as any).value : raw;
            if (value !== undefined && value !== null && String(value).trim()) safe[key] = String(value).trim();
        }
        return safe;
    }

    private toRecord(value: unknown): Record<string, any> {
        if (!value) return {};
        if (value instanceof Map) return Object.fromEntries(value.entries());
        if (typeof (value as any).toObject === "function") return (value as any).toObject();
        if (typeof value === "object") return value as Record<string, any>;
        return {};
    }

    private matchesCaseName(stored: string, requested: string): boolean {
        const left = this.normalize(stored);
        const right = this.normalize(requested);
        return left === right || left.includes(right) || right.includes(left);
    }

    private normalize(value: string): string {
        return String(value || "").replace(/\s+/g, "").toLowerCase();
    }
}
