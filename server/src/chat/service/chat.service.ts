import { Injectable } from "@nestjs/common";
import { Observable } from "rxjs";
import { LlmService, ChatMessage, TokenUsage } from "src/llm";
import { KbCatalogCache } from "src/knowledge-base";
import { ChatHistoryItem } from "../domain/dto/chat.dto";
import { ChatSessionService, SESSION_MAX_MESSAGES } from "./chat-session.service";
import { ChatDiagnosticsService, ChatMetrics } from "./chat.diagnostics.service";
import { PromptBuilder, PromptContext } from "./prompt.builder";
import { IntentClassifier } from "./intent-classifier";
import { DataAggregator } from "./data-aggregator";

@Injectable()
export class ChatService {
    constructor(
        private readonly intentClassifier: IntentClassifier,
        private readonly dataAggregator: DataAggregator,
        private readonly llmService: LlmService,
        private readonly diag: ChatDiagnosticsService,
        private readonly catalogCache: KbCatalogCache,
        private readonly sessionService: ChatSessionService,
    ) {}

    chatStream(
        question: string,
        history?: ChatHistoryItem[],
        from?: string,
        modelId?: string,
        sessionId?: string,
        userId?: string,
    ): Observable<{ type: "status" | "thinking" | "token"; data: string; stage?: string }> {
        return new Observable(subscriber => {
            (async () => {
                const t0 = Date.now();

                // 会话模式：传了 sessionId 则从服务端读最近 20 条历史（替代前端回传），否则保持原有无状态行为
                const persistSession = sessionId && userId ? { sessionId, userId, question } : undefined;
                let resolvedHistory = history || [];
                let historyLimit = 10;

                // metrics 收集变量
                let intentMetrics: ChatMetrics["intent"];
                const fetchMetrics: Record<string, number> = {};
                let promptElapsed = 0;
                let ttft = 0;
                let streamUsage: TokenUsage | undefined;

                try {
                    // 0. 会话历史加载（失败走 SSE error 事件）
                    if (persistSession) {
                        resolvedHistory = await this.sessionService.loadHistory(userId, sessionId);
                        historyLimit = SESSION_MAX_MESSAGES;
                    }

                    // 1. 意图分类
                    subscriber.next({ type: "status", data: "正在理解您的问题...", stage: "classifying" });
                    const tIntent = Date.now();
                    const { sources, chatResult } = await this.intentClassifier.classify(question, resolvedHistory);
                    const intentElapsed = Date.now() - tIntent;
                    this.diag.logIntent(question, sources);

                    if (chatResult?.usage) {
                        intentMetrics = {
                            elapsed: intentElapsed,
                            promptTokens: chatResult.usage.prompt_tokens,
                            completionTokens: chatResult.usage.completion_tokens,
                            totalTokens: chatResult.usage.total_tokens,
                        };
                    } else {
                        intentMetrics = {
                            elapsed: intentElapsed,
                            promptTokens: 0,
                            completionTokens: 0,
                            totalTokens: 0,
                        };
                    }

                    // 根据 from 过滤不可用的数据源
                    const filteredSources = this.intentClassifier.filterSources(sources, from);

                    // 2. 无匹配数据源 → 直接 LLM 自由回答
                    if (filteredSources.length === 0) {
                        subscriber.next({ type: "status", data: "正在思考...", stage: "generating" });
                        const messages = this.buildFreeformMessages(question, resolvedHistory, from, historyLimit);
                        this.diag.logFreeformPrompt(messages);
                        const tLlm = Date.now();
                        const stream$ = this.llmService.chatStream(messages, modelId);
                        const sub = this.subscribeStream(
                            stream$,
                            tLlm,
                            t0,
                            { intentMetrics, fetchMetrics, promptElapsed: 0, from, sources },
                            subscriber,
                            persistSession,
                            ttftRef => {
                                ttft = ttftRef;
                            },
                        );
                        return () => sub.unsubscribe();
                    }

                    // 3. 有匹配数据源 → 并行获取数据
                    subscriber.next({ type: "status", data: "正在获取相关数据...", stage: "fetching" });
                    if (filteredSources.includes("alert")) {
                        subscriber.next({ type: "status", data: "正在查询台风数据...", stage: "fetching" });
                    }
                    if (filteredSources.includes("rag")) {
                        subscriber.next({ type: "status", data: "正在检索知识库...", stage: "fetching" });
                    }
                    if (filteredSources.some(s => s.startsWith("command"))) {
                        subscriber.next({ type: "status", data: "正在查询指挥事件...", stage: "fetching" });
                    }

                    const { alert, ragResult, events, operations } = await this.dataAggregator.fetch(
                        filteredSources,
                        question,
                        fetchMetrics,
                    );
                    this.diag.logFetchResult({
                        sources: filteredSources,
                        alert,
                        ragResult,
                        events,
                        operations,
                        elapsed: Object.values(fetchMetrics).reduce((a, b) => Math.max(a, b), 0),
                    });

                    // 4. Prompt 构建
                    const tPrompt = Date.now();
                    const queryTime = alert?.timeContext?.queryTime
                        ? new Date(alert.timeContext.queryTime)
                        : new Date();
                    const commandType = filteredSources.includes("command-all")
                        ? "all"
                        : filteredSources.includes("command-active")
                          ? "active"
                          : null;
                    const messages = this.buildMessages(question, resolvedHistory, historyLimit, {
                        alert,
                        ragResult,
                        events,
                        operations,
                        queryTime,
                        commandType,
                        from,
                    });
                    promptElapsed = Date.now() - tPrompt;
                    this.diag.logPrompt(messages);

                    // 5. LLM 流式输出
                    subscriber.next({ type: "status", data: "正在生成回答...", stage: "generating" });
                    const tLlm = Date.now();
                    const stream$ = this.llmService.chatStream(messages, modelId);
                    const sub = this.subscribeStream(
                        stream$,
                        tLlm,
                        t0,
                        { intentMetrics, fetchMetrics, promptElapsed, from, sources },
                        subscriber,
                        persistSession,
                        ttftRef => {
                            ttft = ttftRef;
                        },
                    );
                    return () => sub.unsubscribe();
                } catch (err) {
                    this.diag.logError(Date.now() - t0, err, question);
                    subscriber.error(err);
                }
            })();
        });
    }

    // ─── 私有辅助 ────────────────────────────────────────────────

    private buildFreeformMessages(
        question: string,
        history?: ChatHistoryItem[],
        from?: string,
        historyLimit = 10,
    ): ChatMessage[] {
        const messages: ChatMessage[] = [
            { role: "system", content: PromptBuilder.buildFreeformSystemPrompt(from, this.catalogCache) },
        ];
        if (history?.length) {
            messages.push(
                ...history
                    .slice(-historyLimit)
                    .map(h => ({ role: h.role as "user" | "assistant", content: h.content })),
            );
        }
        messages.push({ role: "user", content: question });
        return messages;
    }

    private buildMessages(
        question: string,
        history: ChatHistoryItem[] | undefined,
        historyLimit: number,
        ctx: PromptContext,
    ): ChatMessage[] {
        const systemPrompt = PromptBuilder.buildSystemPrompt(ctx, this.catalogCache);
        const messages: ChatMessage[] = [{ role: "system", content: systemPrompt }];
        if (history?.length) {
            messages.push(
                ...history
                    .slice(-historyLimit)
                    .map(h => ({ role: h.role as "user" | "assistant", content: h.content })),
            );
        }
        messages.push({ role: "user", content: question });
        return messages;
    }

    /** 订阅 LLM 流式输出并统一转发，在 complete 时记录 metrics（并写回会话，如有） */
    private subscribeStream(
        stream$: Observable<any>,
        tLlm: number,
        t0: number,
        ctx: {
            intentMetrics: ChatMetrics["intent"];
            fetchMetrics: Record<string, number>;
            promptElapsed: number;
            from?: string;
            sources: string[];
        },
        subscriber: any,
        persist?: { sessionId: string; userId: string; question: string },
        onTtft?: (ttft: number) => void,
    ) {
        let firstToken = true;
        let streamT0 = 0;
        let streamUsage: TokenUsage | undefined;
        let textTokenCount = 0;
        let assistantText = "";

        return stream$.subscribe({
            next: (event: any) => {
                if (event.type === "token" && firstToken) {
                    firstToken = false;
                    streamT0 = Date.now();
                    if (onTtft) onTtft(streamT0 - tLlm);
                }
                if (event.type === "token") {
                    textTokenCount++;
                    assistantText += event.data;
                }
                if (event.type === "usage") {
                    streamUsage = event.data;
                    return; // usage 仅内部消费，不转发
                }
                if (event.type === "tool_call") {
                    return; // tool_call 仅 Agent 模式使用，不转发
                }
                subscriber.next(event);
            },
            error: (err: any) => subscriber.error(err),
            complete: async () => {
                const now = Date.now();
                const streamDuration = streamT0 ? now - streamT0 : 0;
                const streamSec = streamDuration / 1000;
                const speed = streamSec > 0 ? Math.round((textTokenCount / streamSec) * 10) / 10 : 0;

                this.diag.logMetrics({
                    total: now - t0,
                    intent: ctx.intentMetrics,
                    fetch: ctx.fetchMetrics,
                    prompt: ctx.promptElapsed,
                    ttft: streamT0 ? streamT0 - tLlm : 0,
                    stream: streamDuration,
                    usage: streamUsage
                        ? {
                              promptTokens: streamUsage.prompt_tokens,
                              completionTokens: streamUsage.completion_tokens,
                              totalTokens: streamUsage.total_tokens,
                          }
                        : undefined,
                    speed,
                    textTokens: textTokenCount,
                    from: ctx.from,
                    sources: ctx.sources,
                });

                // 会话写回：追加本轮问答（内部已兜底，失败不影响响应）
                if (persist && assistantText) {
                    await this.sessionService.appendExchange(
                        persist.userId,
                        persist.sessionId,
                        persist.question,
                        assistantText,
                    );
                }

                subscriber.complete();
            },
        });
    }
}
