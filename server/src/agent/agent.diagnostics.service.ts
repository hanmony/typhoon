import { Injectable, Logger } from "@nestjs/common";

/** Agent 链路完整指标 */
export interface AgentMetrics {
    total: number; // 总耗时 ms
    rounds: number; // agent loop 轮次
    toolCalls: number; // tool 调用总次数
    toolElapsed: number; // tool 执行总耗时 ms
    ttft: number; // 首 token 延迟 ms
    stream: number; // 流式输出时长 ms
    usage?: {
        // token 用量（所有轮次累加）
        promptTokens: number;
        completionTokens: number;
        totalTokens: number;
    };
    speed: number; // 吐字速度 tok/s（仅正文 token）
    textTokens: number; // 正文输出 token 数
}

@Injectable()
export class AgentDiagnosticsService {
    private readonly logger = new Logger(AgentDiagnosticsService.name);

    /** 结构化指标单行日志 */
    logMetrics(metrics: AgentMetrics): void {
        const parts: string[] = [`总耗时=${metrics.total}ms`];

        parts.push(`轮次=${metrics.rounds}`);
        parts.push(`tool调用=${metrics.toolCalls}次(${metrics.toolElapsed}ms)`);
        parts.push(`首 token 等待=${metrics.ttft}ms`);
        parts.push(`流式输出=${metrics.stream}ms`);

        if (metrics.usage) {
            const u = metrics.usage;
            parts.push(`token{输入=${u.promptTokens}, 输出=${u.completionTokens}, 总计=${u.totalTokens}}`);
        }

        parts.push(`吐字速度=${metrics.speed} tok/s (正文=${metrics.textTokens})`);

        this.logger.log(`[agent] 指标: ${parts.join(" | ")}`);
    }

    /** 每轮 debug 日志 */
    logRound(
        round: number,
        elapsed: number,
        toolCallCount: number,
        usage?: { promptTokens: number; completionTokens: number; totalTokens: number },
    ): void {
        const usageStr = usage
            ? ` token{输入=${usage.promptTokens}, 输出=${usage.completionTokens}, 总计=${usage.totalTokens}}`
            : "";
        this.logger.debug(`[agent] round ${round}: 耗时=${elapsed}ms | tool调用=${toolCallCount}${usageStr}`);
    }

    /** 异常日志 */
    logError(elapsed: number, error: unknown, question?: string): void {
        const q = question ? ` question="${question.substring(0, 100)}"` : "";
        this.logger.error(`[agent] error after ${elapsed}ms:${q} -> ${(error as Error).message}`);
    }
}
