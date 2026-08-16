import { ToolExecutionResult } from "../domain/agent.types";

/** OpenAI function call 格式的工具定义 */
export interface IToolDefinition {
    type: "function";
    function: {
        name: string;
        description: string;
        parameters: {
            type: "object";
            properties: Record<string, any>;
            required?: string[];
        };
    };
}

/** 工具执行器接口 */
export interface IToolExecutor {
    /** 执行工具，返回 JSON 格式结果供 LLM 消费 */
    execute(args: Record<string, any>): Promise<ToolExecutionResult>;

    /** 动态构建工具定义（每次调用时构建，用于注入运行时上下文） */
    buildDefinition?(): IToolDefinition;
}
