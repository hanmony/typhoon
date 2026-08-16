import { Injectable, Logger } from "@nestjs/common";
import { RagService, KbCatalogCache, CATEGORY_LABELS } from "src/knowledge-base";
import { IToolDefinition, IToolExecutor } from "./tool.interface";
import { ToolExecutionResult } from "../domain/agent.types";

@Injectable()
export class SearchDocumentsTool implements IToolExecutor {
    private readonly logger = new Logger(SearchDocumentsTool.name);

    static readonly BASE_DEFINITION: IToolDefinition = {
        type: "function",
        function: {
            name: "search_documents",
            description: "",
            parameters: {
                type: "object",
                properties: {
                    query: {
                        type: "string",
                        description: "检索关键词或问题",
                    },
                },
                required: ["query"],
            },
        },
    };

    constructor(
        private readonly ragService: RagService,
        private readonly catalogCache: KbCatalogCache,
    ) {}

    buildDefinition(): IToolDefinition {
        const catalog = this.catalogCache.getCatalog();
        let description: string;

        if (catalog.length > 0) {
            const docLines = catalog
                .map(entry => {
                    const categoryLabel = CATEGORY_LABELS[entry.category] || entry.category;
                    const allTags = [...new Set([...entry.autoTags, ...entry.manualTags])];
                    const tagText = allTags.length > 0 ? ` — 涵盖 ${allTags.join("、")}` : "";
                    return `- 《${entry.name}》(分类:${categoryLabel})${tagText}`;
                })
                .join("\n");

            description = `在知识库中检索相关文档。当前知识库包含以下文档：\n${docLines}`;
        } else {
            description =
                "在知识库中检索相关文档，包括预案、操作规程、历史案例、应急措施等。当用户询问应急预案、操作规程、历史案例、防汛知识、处置措施等问题时使用此工具。";
        }

        this.logger.debug(`[search-documents] built description (${description.length} chars):\n${description}`);

        return {
            ...SearchDocumentsTool.BASE_DEFINITION,
            function: {
                ...SearchDocumentsTool.BASE_DEFINITION.function,
                description,
            },
        };
    }

    async execute(args: Record<string, any>): Promise<ToolExecutionResult> {
        const query = args.query as string;
        if (!query) {
            return {
                success: false,
                data: JSON.stringify({ error: "缺少必填参数: query" }),
            };
        }

        try {
            const results = await this.ragService.retrieve(query, 5);
            const summary = {
                query,
                results: results.map((r, i) => ({
                    index: i + 1,
                    content: r.content,
                    documentName: r.documentName,
                    score: r.score,
                })),
                total: results.length,
            };

            return {
                success: true,
                data: JSON.stringify(summary),
            };
        } catch (err) {
            this.logger.error(`search_documents error: ${(err as Error).message}`);
            return {
                success: false,
                data: JSON.stringify({ error: `文档检索失败: ${(err as Error).message}` }),
            };
        }
    }
}
