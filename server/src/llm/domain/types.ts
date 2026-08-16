/** LLM 模块共享类型 */

export interface ChatMessage {
    role: "system" | "user" | "assistant";
    content: string;
}

export interface TokenUsage {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
}

export interface ChatResult {
    content: string;
    usage?: TokenUsage;
}

export interface ToolCall {
    id: string;
    name: string;
    arguments: string; // JSON string
}

export interface AgentChatResult {
    content: string | null;
    reasoningContent?: string;
    toolCalls?: ToolCall[];
    usage?: TokenUsage;
}

export interface LlmPurposeConfig {
    baseUrl: string;
    apiKey: string;
    model: string;
}

export type LlmStreamEvent =
    | { type: "thinking"; data: string }
    | { type: "token"; data: string }
    | { type: "usage"; data: TokenUsage }
    | { type: "tool_call"; data: { index: number; id?: string; name?: string; arguments?: string } };
