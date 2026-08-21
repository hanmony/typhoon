import { Injectable, Logger } from "@nestjs/common";
import { Observable } from "rxjs";
import { EmbeddingService } from "./embedding.service";
import { QdrantService, QdrantSearchResult } from "./qdrant.service";
import { LlmService, ChatMessage, LlmStreamEvent } from "src/llm";
import { RagResponseDto } from "../domain/dto/rag-response.dto";
import { RepoService } from "src/database/service/repo/repo.service";

type RagStreamEvent = { type: "sources"; data: any } | LlmStreamEvent;

interface LexicalChunk {
    id: string;
    documentId: string;
    documentName: string;
    category: string;
    chunkIndex: number;
    content: string;
    normalizedName: string;
    normalizedContent: string;
}

@Injectable()
export class RagService {
    private readonly logger = new Logger(RagService.name);
    private lexicalChunks: LexicalChunk[] = [];
    private lexicalLoadedAt = 0;
    private lexicalLoadPromise?: Promise<void>;
    private static readonly LEXICAL_CACHE_TTL_MS = 5 * 60 * 1000;

    constructor(
        private readonly embedding: EmbeddingService,
        private readonly qdrant: QdrantService,
        private readonly llm: LlmService,
        private readonly repo: RepoService,
    ) {}

    async query(
        question: string,
        topK: number = 5,
        category?: string,
        history?: ChatMessage[],
    ): Promise<RagResponseDto> {
        const sources = await this.retrieve(question, topK, category);
        const messages = this.buildMessages(question, sources, history);
        const chatResult = await this.llm.chat(messages);
        return {
            answer: chatResult.content,
            sources: sources.map(s => ({
                content: s.content,
                documentName: s.documentName,
                chunkIndex: s.chunkIndex,
                score: s.score,
            })),
        };
    }

    queryStream(
        question: string,
        topK: number = 5,
        category?: string,
        history?: ChatMessage[],
    ): Observable<RagStreamEvent> {
        return new Observable(subscriber => {
            (async () => {
                try {
                    const sources = await this.retrieve(question, topK, category);
                    const messages = this.buildMessages(question, sources, history);

                    // Send sources first
                    subscriber.next({
                        type: "sources",
                        data: sources.map(s => ({
                            content: s.content,
                            documentName: s.documentName,
                            chunkIndex: s.chunkIndex,
                            score: s.score,
                        })),
                    });

                    const stream$ = this.llm.chatStream(messages);
                    const sub = stream$.subscribe({
                        next: event => subscriber.next(event),
                        error: err => subscriber.error(err),
                        complete: () => subscriber.complete(),
                    });

                    return () => sub.unsubscribe();
                } catch (err) {
                    subscriber.error(err);
                }
            })();
        });
    }

    async retrieve(question: string, topK: number, category?: string): Promise<QdrantSearchResult[]> {
        const limit = Math.max(0, Math.floor(topK));
        if (!question?.trim() || limit === 0) return [];

        const semanticSlots = limit === 1 ? 1 : Math.max(1, Math.floor(limit / 5));
        const lexicalSlots = limit - semanticSlots;
        let [lexical, semantic] = await Promise.all([
            this.searchLexical(question, lexicalSlots, category),
            this.searchSemantic(question, Math.max(limit, semanticSlots * 3), category),
        ]);
        if (semantic.length === 0 && lexical.length < limit) {
            lexical = await this.searchLexical(question, limit, category);
        }

        const merged: QdrantSearchResult[] = [];
        const seen = new Set<string>();
        const append = (item: QdrantSearchResult) => {
            const key = this.resultKey(item);
            if (seen.has(key) || merged.length >= limit) return;
            seen.add(key);
            merged.push(item);
        };

        lexical.forEach(append);
        semantic.forEach(append);
        return merged;
    }

    private async searchSemantic(question: string, limit: number, category?: string): Promise<QdrantSearchResult[]> {
        try {
            const queryVector = await this.embedding.embedQuery(question);
            return await this.qdrant.search(queryVector, limit, category);
        } catch (err) {
            this.logger.warn(`Semantic retrieval unavailable, using lexical fallback: ${(err as Error).message}`);
            return [];
        }
    }

    private async searchLexical(question: string, limit: number, category?: string): Promise<QdrantSearchResult[]> {
        if (limit <= 0) return [];
        await this.ensureLexicalCache();
        const terms = this.queryTerms(question);
        if (terms.length === 0) return [];
        const sourceHint = this.extractSourceHint(question);

        const candidates = this.lexicalChunks.filter(chunk => !category || chunk.category === category);
        const documentFrequency = new Map<string, number>();
        for (const term of terms) {
            documentFrequency.set(
                term,
                candidates.reduce(
                    (count, chunk) =>
                        count +
                        (chunk.normalizedName.includes(term) || chunk.normalizedContent.includes(term) ? 1 : 0),
                    0,
                ),
            );
        }

        const scored = candidates
            .map(chunk => ({
                chunk,
                score: this.lexicalScore(chunk, terms, documentFrequency, candidates.length, sourceHint),
            }))
            .filter(item => item.score > 0)
            .sort(
                (a, b) =>
                    b.score - a.score ||
                    a.chunk.documentName.localeCompare(b.chunk.documentName, "zh-CN") ||
                    a.chunk.chunkIndex - b.chunk.chunkIndex,
            )
            .slice(0, limit);

        const best = scored[0]?.score || 1;
        return scored.map(({ chunk, score }) => ({
            id: chunk.id,
            score: Number((score / best).toFixed(6)),
            content: chunk.content,
            documentId: chunk.documentId,
            documentName: chunk.documentName,
            chunkIndex: chunk.chunkIndex,
        }));
    }

    private async ensureLexicalCache(): Promise<void> {
        if (this.lexicalLoadedAt > 0 && Date.now() - this.lexicalLoadedAt < RagService.LEXICAL_CACHE_TTL_MS) return;
        if (this.lexicalLoadPromise) return this.lexicalLoadPromise;

        this.lexicalLoadPromise = (async () => {
            try {
                const documents = await this.repo.kbDocuments.find({ status: 3 }).exec();
                const documentMap = new Map(
                    documents.map(doc => [
                        doc._id.toString(),
                        { name: String(doc.name || ""), category: String(doc.category || "other") },
                    ]),
                );
                const chunks = await this.repo.kbChunks
                    .find({ documentId: { $in: [...documentMap.keys()] } })
                    .exec();

                this.lexicalChunks = chunks
                    .map(chunk => {
                        const documentId = String(chunk.documentId);
                        const document = documentMap.get(documentId);
                        if (!document) return null;
                        const content = String(chunk.content || "");
                        return {
                            id: String(chunk.qdrantPointId || chunk._id),
                            documentId,
                            documentName: document.name,
                            category: document.category,
                            chunkIndex: Number(chunk.chunkIndex),
                            content,
                            normalizedName: this.normalizeText(document.name),
                            normalizedContent: this.normalizeText(content),
                        } as LexicalChunk;
                    })
                    .filter(Boolean);
                this.lexicalLoadedAt = Date.now();
                this.logger.log(`Lexical retrieval cache loaded: ${this.lexicalChunks.length} chunks`);
            } catch (err) {
                this.logger.warn(`Lexical retrieval cache unavailable: ${(err as Error).message}`);
                this.lexicalChunks = [];
                this.lexicalLoadedAt = Date.now();
            } finally {
                this.lexicalLoadPromise = undefined;
            }
        })();
        return this.lexicalLoadPromise;
    }

    private queryTerms(question: string): string[] {
        const normalized = this.normalizeText(question);
        const ignoredWords = [
            "期间",
            "是什么",
            "是多少",
            "多少",
            "哪些",
            "什么",
            "如何",
            "影响",
            "台风",
            "应该",
            "可以",
            "是否",
            "根据",
            "其中",
        ];
        let meaningful = normalized;
        for (const word of ignoredWords) meaningful = meaningful.replaceAll(this.normalizeText(word), "");

        const terms = new Set<string>();
        for (const numeric of meaningful.match(/\d+(?:\.\d+)?(?:公里|千米|毫米|小时|分钟|km\/h|m\/s|级|条|座|时)?/gi) || []) {
            terms.add(numeric.toLowerCase());
        }
        for (const size of [4, 3, 2]) {
            for (let index = 0; index <= meaningful.length - size; index++) {
                const term = meaningful.slice(index, index + size);
                if (!/^\d+$/.test(term)) terms.add(term);
            }
        }
        return [...terms];
    }

    private lexicalScore(
        chunk: LexicalChunk,
        terms: string[],
        documentFrequency: Map<string, number>,
        candidateCount: number,
        sourceHint: string,
    ): number {
        let score = 0;
        for (const term of terms) {
            const numeric = /\d/.test(term);
            const lengthWeight = term.length >= 4 ? 3 : term.length === 3 ? 2 : 1;
            const frequency = documentFrequency.get(term) || 0;
            const inverseFrequency = Math.log((candidateCount + 1) / (frequency + 1)) + 1;
            if (chunk.normalizedName.includes(term)) score += lengthWeight * inverseFrequency * (numeric ? 16 : 10);
            if (chunk.normalizedContent.includes(term)) score += lengthWeight * inverseFrequency * (numeric ? 6 : 1);
        }
        if (sourceHint) score += this.titleHintScore(chunk.normalizedName, sourceHint) * 800;
        return score;
    }

    private extractSourceHint(question: string): string {
        const normalized = String(question || "").normalize("NFKC").trim();
        const match = normalized.match(/^(.{2,24}?)(?:中|显示|记载|提到)[，,：:]/);
        return match ? this.normalizeText(match[1]) : "";
    }

    private titleHintScore(normalizedName: string, sourceHint: string): number {
        if (!normalizedName || !sourceHint) return 0;
        const terms = new Set<string>();
        for (const size of [3, 2]) {
            for (let index = 0; index <= sourceHint.length - size; index++) terms.add(sourceHint.slice(index, index + size));
        }
        if (terms.size === 0) return 0;
        const matches = [...terms].filter(term => normalizedName.includes(term)).length;
        const coverage = matches / terms.size;
        if (coverage < 0.25) return 0;
        const lengthFactor = Math.sqrt(Math.min(1, sourceHint.length / normalizedName.length));
        return coverage * lengthFactor;
    }

    private normalizeText(value: string): string {
        return String(value || "")
            .normalize("NFKC")
            .toLowerCase()
            .replace(/[\s\p{P}\p{S}]+/gu, "");
    }

    private resultKey(result: QdrantSearchResult): string {
        return `${result.documentId}:${result.chunkIndex}`;
    }

    private buildMessages(question: string, sources: QdrantSearchResult[], history?: ChatMessage[]): ChatMessage[] {
        const context =
            sources.length > 0
                ? sources.map((s, i) => `[${i + 1}] ${s.content}`).join("\n---\n")
                : "暂无相关参考资料。";

        const systemPrompt = `你是地铁防汛防台智能助手。请根据以下参考资料回答用户的问题。
如果参考资料中没有相关信息，请说明你无法根据现有知识回答，不要编造答案。
回答要求：使用中文，引用具体条款时标注来源编号 [1][2]。

参考资料：
${context}`;

        const messages: ChatMessage[] = [{ role: "system", content: systemPrompt }];
        if (history?.length) {
            messages.push(...history);
        }
        messages.push({ role: "user", content: question });
        return messages;
    }
}
