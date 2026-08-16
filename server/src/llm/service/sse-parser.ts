import { Logger } from "@nestjs/common";
import { TokenUsage, LlmStreamEvent } from "../domain/types";

/**
 * SseParser — SSE 流解析工具类
 *
 * 将 Node.js ReadableStream（LLM SSE 响应）解析为事件数组。
 * 框架无关的纯解析逻辑，从 LlmService 中提取以消除重复。
 */
export class SseParser {
    private readonly logger = new Logger(SseParser.name);

    /**
     * 解析 SSE 流，返回收集到的事件数组。
     *
     * 当传入 onEvent 回调时，每个事件会在 stream "data" 事件中立即触发回调，
     * 实现真正的逐事件流式输出。返回的 Promise 仍会 resolve 为完整事件数组
     * （含末尾的 usage 事件），以保持向后兼容。
     *
     * @param stream Node.js ReadableStream（response.data，responseType: "stream"）
     * @param options.hasTools 是否开启 tool_call fragment 解析
     * @param onEvent 可选回调，每解析出一个事件立即触发（流式场景使用）
     * @returns Promise，resolve 为解析出的事件列表
     */
    parseStream(
        stream: NodeJS.ReadableStream,
        options?: { hasTools?: boolean },
        onEvent?: (event: LlmStreamEvent) => void,
    ): Promise<LlmStreamEvent[]> {
        const events: LlmStreamEvent[] = [];
        const hasTools = options?.hasTools ?? false;

        const emit = (event: LlmStreamEvent) => {
            events.push(event);
            if (onEvent) {
                onEvent(event);
            }
        };

        return new Promise((resolve, reject) => {
            let buffer = "";
            let lastUsage: TokenUsage | undefined;

            const processBuffer = (flush: boolean) => {
                const lines = buffer.split("\n");
                buffer = flush ? "" : lines.pop() || "";

                for (const line of lines) {
                    const trimmed = line.trim();
                    if (trimmed.startsWith("data: ") && trimmed !== "data: [DONE]") {
                        try {
                            const json = JSON.parse(trimmed.slice(6));

                            // capture usage from any chunk (typically the last)
                            if (json.usage) {
                                lastUsage = {
                                    prompt_tokens: json.usage.prompt_tokens,
                                    completion_tokens: json.usage.completion_tokens,
                                    total_tokens: json.usage.total_tokens,
                                };
                            }

                            const delta = json.choices?.[0]?.delta;

                            // thinking / reasoning content
                            const thinking =
                                delta?.reasoning_content ??
                                delta?.reasoningContent ??
                                delta?.reasoning ??
                                delta?.thinking_content ??
                                delta?.thinking;
                            if (thinking) emit({ type: "thinking", data: thinking });

                            // text content
                            const content = delta?.content;
                            if (content) emit({ type: "token", data: content });

                            // streaming tool_calls fragments
                            if (hasTools && delta?.tool_calls) {
                                for (const tc of delta.tool_calls) {
                                    emit({
                                        type: "tool_call",
                                        data: {
                                            index: tc.index,
                                            id: tc.id,
                                            name: tc.function?.name,
                                            arguments: tc.function?.arguments,
                                        },
                                    });
                                }
                            }
                        } catch {
                            this.logger.debug(`Failed to parse SSE line: ${trimmed}`);
                        }
                    }
                }
            };

            stream.on("data", (chunk: Buffer) => {
                buffer += chunk.toString();
                processBuffer(false);
            });

            stream.on("end", () => {
                processBuffer(true); // flush remaining buffer
                if (lastUsage) {
                    emit({ type: "usage", data: lastUsage });
                }
                resolve(events);
            });

            stream.on("error", (err: Error) => reject(err));
        });
    }
}
