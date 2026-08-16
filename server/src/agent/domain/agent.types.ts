import { TokenUsage } from "src/llm";

/** OpenAI 标准 tool_calls 条目格式（用于 messages 上下文） */
export interface OpenAiToolCall {
    id: string;
    type: "function";
    function: { name: string; arguments: string };
}

/** Agent 模块内部 tool_calls 格式（扁平，便于执行） */
export interface AgentToolCall {
    id: string;
    name: string;
    arguments: string; // JSON string
}

/** Agent 内部消息格式（兼容 OpenAI ChatCompletionMessageParam） */
export type AgentMessage =
    | { role: "system"; content: string }
    | { role: "user"; content: string }
    | { role: "assistant"; content: string | null; tool_calls?: OpenAiToolCall[] }
    | { role: "tool"; tool_call_id: string; content: string };

/** Agent SSE 流事件 */
export type AgentStreamEvent =
    | { type: "status"; data: string; stage?: string }
    | { type: "thinking"; data: string }
    | { type: "token"; data: string }
    | {
          type: "tool";
          data: { name: string; arguments?: string; status: "executing" | "done" | "error"; result?: string };
      }
    | { type: "usage"; data: TokenUsage }
    | { type: "error"; data: string };

/** 工具执行结果 */
export interface ToolExecutionResult {
    success: boolean;
    data: string; // JSON string for LLM consumption
}

/** collectStreamRound 返回的流式单轮结果 */
export interface StreamRoundResult {
    toolCalls?: AgentToolCall[];
    content?: string;
    reasoningContent?: string;
    usage?: TokenUsage;
}
