import { Injectable, Logger } from "@nestjs/common";
import { Observable } from "rxjs";
import { EmbeddingService } from "./embedding.service";
import { QdrantService, QdrantSearchResult } from "./qdrant.service";
import { LlmService, ChatMessage, LlmStreamEvent } from "src/llm";
import { RagResponseDto } from "../domain/dto/rag-response.dto";

type RagStreamEvent = { type: "sources"; data: any } | LlmStreamEvent;

@Injectable()
export class RagService {
    private readonly logger = new Logger(RagService.name);

    constructor(
        private readonly embedding: EmbeddingService,
        private readonly qdrant: QdrantService,
        private readonly llm: LlmService,
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
        const queryVector = await this.embedding.embedQuery(question);
        return this.qdrant.search(queryVector, topK, category);
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
