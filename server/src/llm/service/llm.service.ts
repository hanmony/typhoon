import { Injectable, Logger } from "@nestjs/common";
import { HttpService } from "@nestjs/axios";
import { lastValueFrom, map, catchError, Observable } from "rxjs";

import {
    ChatMessage,
    TokenUsage,
    ChatResult,
    ToolCall,
    AgentChatResult,
    LlmPurposeConfig,
    LlmStreamEvent,
} from "../domain/types";
import { SseParser } from "./sse-parser";
import { LlmModelService } from "./llm-model.service";
import { Failed } from "src/diagnostics/lib/failed";

// Re-export types for backward compatibility
export {
    ChatMessage,
    TokenUsage,
    ChatResult,
    ToolCall,
    AgentChatResult,
    LlmPurposeConfig,
    LlmStreamEvent,
} from "../domain/types";

@Injectable()
export class LlmService {
    private readonly logger = new Logger(LlmService.name);

    constructor(
        private readonly http: HttpService,
        private readonly sseParser: SseParser,
        private readonly modelService: LlmModelService,
    ) {}

    private readonly IDLE_TIMEOUT = 60_000;

    /** 按模型 ID 获取配置（从缓存），用于用户指定模型的场景 */
    private getConfigByModelId(modelId: string): LlmPurposeConfig {
        const m = this.modelService.getById(modelId);
        Failed.check(m, `模型 ${modelId} 不存在`);
        return { baseUrl: m.baseUrl, apiKey: m.apiKey, model: m.model };
    }

    /** 根据 purpose 路由到不同模型配置（从数据库缓存获取） */
    private getConfigForPurpose(purpose?: string): LlmPurposeConfig {
        if (purpose === "light") {
            const small = this.modelService.getDefaultSmall();
            Failed.check(small, "未配置默认模型，请在模型管理中添加并设置默认模型");
            return { baseUrl: small.baseUrl, apiKey: small.apiKey, model: small.model };
        }

        // default / agent → 大模型
        const large = this.modelService.getDefaultLarge();
        Failed.check(large, "未配置默认模型，请在模型管理中添加并设置默认模型");
        return { baseUrl: large.baseUrl, apiKey: large.apiKey, model: large.model };
    }

    async chat(messages: ChatMessage[]): Promise<ChatResult> {
        const cfg = this.getConfigForPurpose();
        const url = `${cfg.baseUrl}/chat/completions`;
        const body = { model: cfg.model, messages, stream: false };

        const ob = this.http
            .post(url, body, {
                headers: {
                    Authorization: `Bearer ${cfg.apiKey}`,
                    "Content-Type": "application/json",
                },
                timeout: 60_000,
            })
            .pipe(
                map(resp => {
                    const content = resp.data.choices[0].message.content as string;
                    const raw = resp.data.usage;
                    const usage: TokenUsage | undefined = raw
                        ? {
                              prompt_tokens: raw.prompt_tokens,
                              completion_tokens: raw.completion_tokens,
                              total_tokens: raw.total_tokens,
                          }
                        : undefined;
                    return { content, usage };
                }),
                catchError(err => {
                    this.logger.error(`LLM API error: ${err.message}`);
                    throw err;
                }),
            );

        return lastValueFrom(ob);
    }

    chatStream(messages: ChatMessage[], modelId?: string): Observable<LlmStreamEvent> {
        return new Observable<LlmStreamEvent>(subscriber => {
            const cfg = modelId ? this.getConfigByModelId(modelId) : this.getConfigForPurpose();
            const url = `${cfg.baseUrl}/chat/completions`;
            const body = {
                model: cfg.model,
                messages,
                stream: true,
                stream_options: { include_usage: true },
            };

            let idleTimer = setTimeout(() => subscriber.error(new Error("LLM 流式响应空闲超时")), this.IDLE_TIMEOUT);
            const resetIdle = () => {
                clearTimeout(idleTimer);
                idleTimer = setTimeout(() => subscriber.error(new Error("LLM 流式响应空闲超时")), this.IDLE_TIMEOUT);
            };

            lastValueFrom(
                this.http.post(url, body, {
                    headers: {
                        Authorization: `Bearer ${cfg.apiKey}`,
                        "Content-Type": "application/json",
                    },
                    responseType: "stream",
                }),
            )
                .then(async response => {
                    await this.sseParser.parseStream(response.data, undefined, event => {
                        resetIdle();
                        subscriber.next(event);
                    });
                    clearTimeout(idleTimer);
                    subscriber.complete();
                })
                .catch(err => {
                    clearTimeout(idleTimer);
                    subscriber.error(err);
                });
        });
    }

    /**
     * Agent 专用：非流式 tool call（发送 tools 参数，解析 tool_calls 响应）
     */
    async chatWithTools(
        messages: Record<string, any>[],
        tools: Record<string, any>[],
        options?: { purpose?: string; temperature?: number; modelId?: string },
    ): Promise<AgentChatResult> {
        const cfg = options?.modelId
            ? this.getConfigByModelId(options.modelId)
            : this.getConfigForPurpose(options?.purpose);
        const url = `${cfg.baseUrl}/chat/completions`;
        const body = {
            model: cfg.model,
            messages,
            tools,
            tool_choice: "auto",
            stream: false,
            ...(options?.temperature !== undefined ? { temperature: options.temperature } : {}),
        };

        this.logger.debug(
            `[agent] chatWithTools: model=${cfg.model}, messages=${messages.length}, tools=${tools.length}`,
        );

        const ob = this.http
            .post(url, body, {
                headers: {
                    Authorization: `Bearer ${cfg.apiKey}`,
                    "Content-Type": "application/json",
                },
                timeout: 60_000,
            })
            .pipe(
                map(resp => {
                    const choice = resp.data.choices[0];
                    const message = choice.message;
                    const raw = resp.data.usage;
                    const usage: TokenUsage | undefined = raw
                        ? {
                              prompt_tokens: raw.prompt_tokens,
                              completion_tokens: raw.completion_tokens,
                              total_tokens: raw.total_tokens,
                          }
                        : undefined;

                    const toolCalls: ToolCall[] | undefined = message.tool_calls
                        ? message.tool_calls.map((tc: any) => ({
                              id: tc.id as string,
                              name: tc.function.name as string,
                              arguments: tc.function.arguments as string,
                          }))
                        : undefined;

                    const reasoningContent =
                        message.reasoning_content ??
                        message.reasoningContent ??
                        message.reasoning ??
                        message.thinking_content ??
                        undefined;

                    return {
                        content: message.content ?? null,
                        reasoningContent,
                        toolCalls,
                        usage,
                    };
                }),
                catchError(err => {
                    const respData = err.response?.data;
                    this.logger.error(`[agent] chatWithTools API error: ${err.message}`);
                    if (respData) {
                        const body = typeof respData === "string" ? respData : JSON.stringify(respData);
                        this.logger.error(`[agent] chatWithTools error response body: ${body}`);
                    }
                    throw err;
                }),
            );

        return lastValueFrom(ob);
    }

    /**
     * Agent 专用：流式输出，支持 purpose 路由和可选 tools 参数
     */
    chatStreamWithTools(
        messages: Record<string, any>[],
        options?: { purpose?: string; tools?: Record<string, any>[]; modelId?: string },
    ): Observable<LlmStreamEvent> {
        return new Observable<LlmStreamEvent>(subscriber => {
            const cfg = options?.modelId
                ? this.getConfigByModelId(options.modelId)
                : this.getConfigForPurpose(options?.purpose);
            const url = `${cfg.baseUrl}/chat/completions`;
            const hasTools = options?.tools && options.tools.length > 0;
            const body: Record<string, any> = {
                model: cfg.model,
                messages,
                stream: true,
                stream_options: { include_usage: true },
                ...(hasTools ? { tools: options!.tools, tool_choice: "auto" } : {}),
            };

            this.logger.debug(
                `[agent] chatStreamWithTools: model=${cfg.model}, messages=${messages.length}, tools=${hasTools ? options!.tools!.length : 0}`,
            );

            let idleTimer = setTimeout(() => subscriber.error(new Error("LLM 流式响应空闲超时")), this.IDLE_TIMEOUT);
            const resetIdle = () => {
                clearTimeout(idleTimer);
                idleTimer = setTimeout(() => subscriber.error(new Error("LLM 流式响应空闲超时")), this.IDLE_TIMEOUT);
            };

            lastValueFrom(
                this.http.post(url, body, {
                    headers: {
                        Authorization: `Bearer ${cfg.apiKey}`,
                        "Content-Type": "application/json",
                    },
                    responseType: "stream",
                }),
            )
                .then(async response => {
                    await this.sseParser.parseStream(response.data, { hasTools }, event => {
                        resetIdle();
                        subscriber.next(event);
                    });
                    clearTimeout(idleTimer);
                    subscriber.complete();
                })
                .catch(err => {
                    clearTimeout(idleTimer);
                    subscriber.error(err);
                });
        });
    }
}
