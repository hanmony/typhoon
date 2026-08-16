import { Injectable, Logger } from "@nestjs/common";
import { LlmService, ChatMessage } from "src/llm";
import { RepoService } from "src/database/service/repo/repo.service";

const CATEGORY_LABELS: Record<string, string> = {
    typhoon_case: "台风案例",
    regulation: "管理规定",
    emergency_plan: "应急预案",
    other: "其他",
};

@Injectable()
export class MetadataService {
    private readonly logger = new Logger(MetadataService.name);

    constructor(
        private readonly llmService: LlmService,
        private readonly repo: RepoService,
    ) {}

    async generateMetadata(chunks: string[]): Promise<{ autoTags: string[]; summary: string }> {
        const text = this.selectChunksForGeneration(chunks);
        const messages: ChatMessage[] = [
            {
                role: "system",
                content: `根据以下文档内容，生成：
1) 3-5 个标签关键词（反映文档涵盖的主题和场景）
2) 一句话摘要（不超过 50 字，描述文档核心内容）

只输出 JSON 格式：{"autoTags": ["标签1", "标签2"], "summary": "摘要内容"}`,
            },
            { role: "user", content: text },
        ];

        try {
            const result = await this.llmService.chat(messages);
            const parsed = this.parseMetadataResult(result.content);
            return parsed;
        } catch (err) {
            // LLM 错误必须向上抛，禁止静默降级返回空对象
            // 原因：空 autoTags/summary 会让上游误判为"无标签/无摘要"，掩盖真实失败
            this.logger.error(`Failed to generate metadata: ${(err as Error).message}`);
            throw err;
        }
    }

    async enrichDocument(documentId: string): Promise<void> {
        const doc = await this.repo.kbDocuments.findById(documentId);
        if (!doc) {
            this.logger.warn(`Document not found for enrichment: ${documentId}`);
            return;
        }

        const chunks = await this.repo.kbChunks.find({ documentId }).sort({ chunkIndex: 1 });
        if (chunks.length === 0) {
            this.logger.warn(`No chunks found for document: ${documentId}`);
            return;
        }

        const contents = chunks.map(c => c.content);
        const metadata = await this.generateMetadata(contents);

        doc.autoTags = metadata.autoTags;
        if (!doc.summary) {
            doc.summary = metadata.summary;
        }
        await doc.save();

        this.logger.log(
            `Enriched document ${doc.name}: tags=[${metadata.autoTags.join(", ")}], summary="${metadata.summary}"`,
        );
    }

    private selectChunksForGeneration(chunks: string[], maxTokens = 3000): string {
        const all = chunks.join("\n");
        if (all.length / 2 < 2000) return all;

        const head = chunks.slice(0, 3).join("\n");
        const tail = chunks[chunks.length - 1];
        const combined = head + "\n" + tail;
        return combined.slice(0, maxTokens * 2);
    }

    private parseMetadataResult(raw: string): { autoTags: string[]; summary: string } {
        const trimmed = raw.trim();
        const jsonMatch = trimmed.match(/\{[\s\S]*?\}/);
        if (!jsonMatch) {
            throw new Error(`No JSON found in metadata result: ${trimmed.slice(0, 100)}`);
        }
        const parsed = JSON.parse(jsonMatch[0]);
        return {
            autoTags: Array.isArray(parsed.autoTags) ? parsed.autoTags.filter((t: any) => typeof t === "string") : [],
            summary: typeof parsed.summary === "string" ? parsed.summary : "",
        };
    }
}

export { CATEGORY_LABELS };
