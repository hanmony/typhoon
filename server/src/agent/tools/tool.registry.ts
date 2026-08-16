import { Injectable, Logger } from "@nestjs/common";
import { IToolDefinition, IToolExecutor } from "./tool.interface";
import { ToolExecutionResult } from "../domain/agent.types";

@Injectable()
export class ToolRegistry {
    private readonly logger = new Logger(ToolRegistry.name);
    private readonly tools = new Map<string, { definition: IToolDefinition; executor: IToolExecutor }>();

    /** 注册工具 */
    register(definition: IToolDefinition, executor: IToolExecutor): void {
        const name = definition.function.name;
        if (this.tools.has(name)) {
            this.logger.warn(`Tool "${name}" already registered, overwriting`);
        }
        this.tools.set(name, { definition, executor });
        this.logger.debug(`Tool registered: ${name}`);
    }

    /** 获取所有工具定义（OpenAI function call 格式），支持动态构建 */
    getToolDefinitions(): IToolDefinition[] {
        return Array.from(this.tools.values()).map(t => {
            if (typeof t.executor.buildDefinition === "function") {
                return t.executor.buildDefinition();
            }
            return t.definition;
        });
    }

    /** 检查工具是否存在 */
    has(name: string): boolean {
        return this.tools.has(name);
    }

    /** 执行工具 */
    async execute(name: string, argsJson: string): Promise<ToolExecutionResult> {
        const entry = this.tools.get(name);
        if (!entry) {
            this.logger.warn(`Unknown tool called: ${name}`);
            return {
                success: false,
                data: JSON.stringify({
                    error: `Unknown tool: ${name}. Available tools: ${Array.from(this.tools.keys()).join(", ")}`,
                }),
            };
        }

        let args: Record<string, any>;
        try {
            args = JSON.parse(argsJson);
        } catch {
            this.logger.warn(`Failed to parse tool arguments for ${name}: ${argsJson}`);
            return {
                success: false,
                data: JSON.stringify({ error: `Invalid JSON arguments for tool ${name}` }),
            };
        }

        try {
            this.logger.debug(`Executing tool: ${name}, args: ${argsJson}`);
            const result = await entry.executor.execute(args);
            this.logger.debug(`Tool ${name} completed: success=${result.success}`);
            return result;
        } catch (err) {
            const msg = (err as Error).message;
            this.logger.error(`Tool ${name} execution error: ${msg}`);
            return {
                success: false,
                data: JSON.stringify({ error: `Tool ${name} execution failed: ${msg}` }),
            };
        }
    }
}
