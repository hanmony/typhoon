import { Injectable, Logger } from "@nestjs/common";
import { Observable, Subscriber } from "rxjs";
import { LlmService, TokenUsage, LlmStreamEvent } from "src/llm";
import { ToolRegistry } from "./tools/tool.registry";
import { AgentStreamEvent, AgentMessage, AgentToolCall, StreamRoundResult } from "./domain/agent.types";
import { AgentHistoryItem } from "./domain/agent.dto";
import { AgentPromptBuilder } from "./prompt/agent.prompt";
import { AgentDiagnosticsService } from "./agent.diagnostics.service";
import { ChatSessionService, SESSION_MAX_MESSAGES } from "src/chat/service/chat-session.service";

const MAX_ROUNDS = 5;

@Injectable()
export class AgentService {
    private readonly logger = new Logger(AgentService.name);

    constructor(
        private readonly llmService: LlmService,
        private readonly toolRegistry: ToolRegistry,
        private readonly diag: AgentDiagnosticsService,
        private readonly sessionService: ChatSessionService,
    ) {}

    chatStream(
        question: string,
        history?: AgentHistoryItem[],
        from?: string,
        modelId?: string,
        sessionId?: string,
        userId?: string,
    ): Observable<AgentStreamEvent> {
        return new Observable<AgentStreamEvent>(subscriber => {
            (async () => {
                const t0 = Date.now();
                let totalUsage: TokenUsage | undefined;
                let rounds = 0;
                let toolCallsTotal = 0;
                let toolElapsedTotal = 0;
                let ttft = 0;
                let streamDuration = 0;
                let textTokens = 0;
                let firstToken = true;

                try {
                    // 0. 会话模式：传了 sessionId 则从服务端读最近 20 条历史（替代前端回传），否则保持原有无状态行为
                    const persistSession = sessionId && userId ? { sessionId, userId, question } : undefined;
                    let resolvedHistory = history || [];
                    let historyLimit = 10;
                    if (persistSession) {
                        resolvedHistory = await this.sessionService.loadHistory(userId, sessionId);
                        historyLimit = SESSION_MAX_MESSAGES;
                    }
                    let finalAnswer = "";

                    // 1. 构建 messages
                    const systemPrompt = AgentPromptBuilder.buildSystemPrompt(from);
                    this.logger.debug(`[agent] system prompt (${systemPrompt.length} chars):\n${systemPrompt}`);
                    const messages: Record<string, any>[] = [{ role: "system", content: systemPrompt }];

                    if (resolvedHistory.length) {
                        messages.push(
                            ...resolvedHistory.slice(-historyLimit).map(
                                h =>
                                    ({
                                        role: h.role as "user" | "assistant",
                                        content: h.content,
                                    }) as AgentMessage,
                            ),
                        );
                    }

                    messages.push({ role: "user", content: question });

                    const tools = this.toolRegistry.getToolDefinitions();
                    this.logger.debug(
                        `[agent] tool definitions: ${tools.map(t => `${t.function.name}: ${t.function.description}`).join("\n")}`,
                    );

                    // 2. Agent Loop — 所有轮次统一使用流式调用
                    for (let round = 0; round < MAX_ROUNDS; round++) {
                        const roundT0 = Date.now();
                        this.logger.debug(`[agent] round ${round + 1}/${MAX_ROUNDS}`);
                        rounds = round + 1;

                        const roundTools = round < MAX_ROUNDS - 1 ? tools : [];
                        subscriber.next({ type: "status", data: "正在思考...", stage: "thinking" });

                        const stream$ = this.llmService.chatStreamWithTools(messages as Record<string, any>[], {
                            purpose: "agent",
                            ...(roundTools.length > 0 ? { tools: roundTools } : {}),
                            ...(modelId ? { modelId } : {}),
                        });
                        const result = await this.collectStreamRound(stream$, subscriber, () => {
                            if (firstToken) {
                                ttft = Date.now() - t0;
                                firstToken = false;
                            }
                        });

                        const roundElapsed = Date.now() - roundT0;

                        // 累加 usage
                        if (result.usage) {
                            if (!totalUsage) {
                                totalUsage = { ...result.usage };
                            } else {
                                totalUsage.prompt_tokens += result.usage.prompt_tokens;
                                totalUsage.completion_tokens += result.usage.completion_tokens;
                                totalUsage.total_tokens += result.usage.total_tokens;
                            }
                        }

                        // 情况 1：LLM 返回 tool_calls → 执行 tool → 继续 loop
                        if (result.toolCalls && result.toolCalls.length > 0) {
                            const assistantMsg: Record<string, any> = {
                                role: "assistant",
                                content: result.content ?? null,
                                tool_calls: result.toolCalls.map(tc => ({
                                    id: tc.id,
                                    type: "function" as const,
                                    function: { name: tc.name, arguments: tc.arguments },
                                })),
                            };
                            if (result.reasoningContent) {
                                assistantMsg.reasoning_content = result.reasoningContent;
                            }
                            messages.push(assistantMsg);

                            for (const call of result.toolCalls) {
                                const toolT0 = Date.now();
                                toolCallsTotal++;

                                subscriber.next({
                                    type: "status",
                                    data: `正在查询${this.getToolDisplayName(call.name)}...`,
                                    stage: "tool_call",
                                });

                                subscriber.next({
                                    type: "tool",
                                    data: {
                                        name: call.name,
                                        arguments: call.arguments,
                                        status: "executing",
                                    },
                                });

                                const execResult = await this.toolRegistry.execute(call.name, call.arguments);
                                toolElapsedTotal += Date.now() - toolT0;

                                messages.push({
                                    role: "tool",
                                    tool_call_id: call.id,
                                    content: execResult.data,
                                });

                                subscriber.next({
                                    type: "tool",
                                    data: {
                                        name: call.name,
                                        status: execResult.success ? "done" : "error",
                                        result: execResult.success ? execResult.data : undefined,
                                    },
                                });
                            }

                            this.diag.logRound(
                                round + 1,
                                roundElapsed,
                                result.toolCalls.length,
                                result.usage
                                    ? {
                                          promptTokens: result.usage.prompt_tokens,
                                          completionTokens: result.usage.completion_tokens,
                                          totalTokens: result.usage.total_tokens,
                                      }
                                    : undefined,
                            );

                            continue;
                        }

                        // 情况 2：LLM 直接返回文本（流式已由 collectStreamRound 转发）
                        if (result.content) {
                            finalAnswer = result.content;
                            streamDuration = Date.now() - roundT0;

                            this.diag.logRound(
                                round + 1,
                                roundElapsed,
                                0,
                                result.usage
                                    ? {
                                          promptTokens: result.usage.prompt_tokens,
                                          completionTokens: result.usage.completion_tokens,
                                          totalTokens: result.usage.total_tokens,
                                      }
                                    : undefined,
                            );

                            break;
                        }

                        // 情况 3：既没有内容也没有 tool_calls（边界情况）
                        this.logger.warn("[agent] empty response from LLM, no content and no tool_calls");
                        finalAnswer = "抱歉，我暂时无法回答这个问题，请稍后再试。";
                        subscriber.next({ type: "token", data: finalAnswer });
                        break;
                    }

                    // 计算吐字速度
                    if (totalUsage) {
                        textTokens = totalUsage.completion_tokens;
                    }
                    const speed = streamDuration > 0 ? Math.round((textTokens / (streamDuration / 1000)) * 10) / 10 : 0;

                    // 发送 usage
                    if (totalUsage) {
                        subscriber.next({ type: "usage", data: totalUsage });
                    }

                    const total = Date.now() - t0;
                    this.diag.logMetrics({
                        total,
                        rounds,
                        toolCalls: toolCallsTotal,
                        toolElapsed: toolElapsedTotal,
                        ttft,
                        stream: streamDuration,
                        usage: totalUsage
                            ? {
                                  promptTokens: totalUsage.prompt_tokens,
                                  completionTokens: totalUsage.completion_tokens,
                                  totalTokens: totalUsage.total_tokens,
                              }
                            : undefined,
                        speed,
                        textTokens,
                    });

                    // 会话写回：追加本轮问答（内部已兜底，失败不影响响应）
                    if (persistSession && finalAnswer) {
                        await this.sessionService.appendExchange(
                            persistSession.userId,
                            persistSession.sessionId,
                            persistSession.question,
                            finalAnswer,
                        );
                    }

                    subscriber.complete();
                } catch (err) {
                    const elapsed = Date.now() - t0;
                    this.diag.logError(elapsed, err, question);
                    subscriber.next({ type: "error", data: (err as Error).message });
                    subscriber.complete();
                }
            })();
        });
    }

    /**
     * 订阅一轮流式 LLM 输出：
     * - 转发 thinking 事件给外部 subscriber
     * - 转发 token 事件给外部 subscriber（最终回答逐 token 流式输出）
     * - 累积 tool_call fragments，流结束后合并为完整的 tool_calls
     * - 返回 { toolCalls?, content?, usage? }
     * @param onFirstToken 可选回调，在收到第一个文本 token 时触发（用于 TTFT 计算）
     */
    private collectStreamRound(
        stream$: Observable<LlmStreamEvent>,
        subscriber: Subscriber<AgentStreamEvent>,
        onFirstToken?: () => void,
    ): Promise<StreamRoundResult> {
        return new Promise((resolve, reject) => {
            // 按 index 累积 tool_call fragments
            const toolCallMap = new Map<number, { id: string; name: string; arguments: string }>();
            let content = "";
            let reasoningContent = "";
            let usage: TokenUsage | undefined;
            let hasSeenToken = false;

            stream$.subscribe({
                next: event => {
                    switch (event.type) {
                        case "thinking":
                            reasoningContent += event.data;
                            subscriber.next({ type: "thinking", data: event.data });
                            break;

                        case "token":
                            content += event.data;
                            subscriber.next({ type: "token", data: event.data });
                            if (!hasSeenToken) {
                                hasSeenToken = true;
                                onFirstToken?.();
                            }
                            break;

                        case "tool_call": {
                            const { index, id, name, arguments: args } = event.data;
                            let existing = toolCallMap.get(index);
                            if (!existing) {
                                existing = { id: "", name: "", arguments: "" };
                                toolCallMap.set(index, existing);
                            }
                            if (id) existing.id = id;
                            if (name) existing.name = name;
                            if (args) existing.arguments += args;
                            break;
                        }

                        case "usage":
                            usage = event.data;
                            break;
                    }
                },
                error: err => reject(err),
                complete: () => {
                    const toolCalls: AgentToolCall[] | undefined =
                        toolCallMap.size > 0
                            ? Array.from(toolCallMap.entries())
                                  .sort(([a], [b]) => a - b)
                                  .map(([, tc]) => ({
                                      id: tc.id,
                                      name: tc.name,
                                      arguments: tc.arguments,
                                  }))
                            : undefined;

                    resolve({
                        toolCalls,
                        content: content || undefined,
                        reasoningContent: reasoningContent || undefined,
                        usage,
                    });
                },
            });
        });
    }

    private getToolDisplayName(name: string): string {
        const names: Record<string, string> = {
            get_current_status: "当前状态",
            get_operations: "运营事件",
            search_documents: "知识库文档",
            get_typhoon_history: "历史台风",
            get_duty_info: "值班信息",
            get_messages: "指挥消息",
            get_severe_weather_history: "预警历史",
            get_patrolling_tours: "巡道记录",
            get_case_actions: "历史案例线路措施",
            get_case_metadata: "历史案例元数据",
        };
        return names[name] || name;
    }
}
