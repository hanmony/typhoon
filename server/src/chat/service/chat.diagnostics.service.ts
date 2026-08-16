import { Injectable, Logger } from "@nestjs/common";
import { ChatMessage } from "src/llm";
import { AlertCurrentResponseDto } from "src/typhoon/alert/dto/alert.dto";
import { RagResponseDto } from "src/knowledge-base/domain/dto/rag-response.dto";
import { TyphoonExtremeEventDto } from "src/typhoon/domain/typhoon.extreme.event.dto";
import { TyphoonExtremeOperationDto } from "src/typhoon/domain/typhoon.extreme.operation.dto";

/** 数据获取结果摘要 */
interface FetchSummary {
    sources: string[];
    alert: AlertCurrentResponseDto | null;
    ragResult: RagResponseDto | null;
    events: TyphoonExtremeEventDto[];
    operations: TyphoonExtremeOperationDto[];
    elapsed: number;
}

/** 完成耗时明细 */
interface CompletionTiming {
    total: number;
    fetch: number;
    llm: number;
}

/** Chat 链路完整指标 */
export interface ChatMetrics {
    total: number; // 总耗时 ms
    intent?: {
        // 意图分类（LLM 或关键词 fallback）
        elapsed: number;
        promptTokens: number;
        completionTokens: number;
        totalTokens: number;
    };
    fetch: Record<string, number>; // 每数据源耗时 ms
    prompt: number; // prompt 构建耗时 ms
    ttft: number; // 首 token 延迟 ms
    stream: number; // 流式输出时长 ms
    usage?: {
        // LLM 流式 token 用量
        promptTokens: number;
        completionTokens: number;
        totalTokens: number;
    };
    speed: number; // 吐字速度 tok/s（仅正文 token）
    textTokens: number; // 正文输出 token 数
    from?: string; // 来源
    sources: string[]; // 意图分类结果
}

@Injectable()
export class ChatDiagnosticsService {
    private readonly logger = new Logger(ChatDiagnosticsService.name);

    /** 结构化指标单行日志 */
    logMetrics(metrics: ChatMetrics): void {
        const parts: string[] = [`总耗时=${metrics.total}ms`];

        if (metrics.intent) {
            const i = metrics.intent;
            parts.push(`意图分类{耗时=${i.elapsed}ms, token=${i.totalTokens}}`);
        }

        const fetchEntries = Object.entries(metrics.fetch);
        if (fetchEntries.length > 0) {
            const fetchStr = fetchEntries.map(([k, v]) => `${k}=${v}ms`).join(", ");
            parts.push(`数据拉取{${fetchStr}}`);
        }

        parts.push(`提示词构建=${metrics.prompt}ms`);
        parts.push(`首 token 等待=${metrics.ttft}ms`);
        parts.push(`流式输出=${metrics.stream}ms`);

        if (metrics.usage) {
            const u = metrics.usage;
            parts.push(`token{输入=${u.promptTokens}, 输出=${u.completionTokens}, 总计=${u.totalTokens}}`);
        }

        parts.push(`吐字速度=${metrics.speed} tok/s (正文=${metrics.textTokens})`);

        this.logger.log(`[chat] 指标: ${parts.join(" | ")}`);
    }

    /** 意图分类结果（debug 级别） */
    logIntent(question: string, sources: string[]): void {
        this.logger.debug(`[chat] question="${question}" → sources=[${sources.join(",")}]`);
    }

    /** 数据获取摘要（debug 级别） */
    logFetchResult(summary: FetchSummary): void {
        const { sources, alert, ragResult, events, operations, elapsed } = summary;
        const parts: string[] = [`[chat] fetchData completed in ${elapsed}ms`];

        if (sources.includes("alert")) {
            if (alert?.typhoon) {
                const t = alert.typhoon;
                const wc = alert.windCircle;
                parts.push(
                    `alert: typhoon=${t.name}(${t.enName}) center=${t.center?.join(",")} ` +
                        `speed=${t.speed}km/h strong=${t.strong} overlapping=${wc?.isOverlapping} ` +
                        `cleared=${alert?.timeContext?.windCircleClearedShanghai}`,
                );
            } else {
                parts.push(`alert: no typhoon data (isSimulation=${alert?.timeContext?.isSimulation})`);
            }
            if (alert?.prediction) {
                const p = alert.prediction;
                parts.push(`prediction: landing=${p.landing?.status || "none"} overlay=${p.overlay?.status || "none"}`);
            }
        }

        if (sources.includes("rag")) {
            const hitCount = ragResult?.sources?.length ?? 0;
            parts.push(`rag: ${hitCount} hits`);
        }

        if (sources.some(s => s.startsWith("command"))) {
            parts.push(`events=${events.length} operations=${operations.length}`);
        }

        this.logger.debug(parts.join(" | "));
    }

    /** prompt 内容（debug 级别，生产环境默认不输出） */
    logPrompt(messages: ChatMessage[]): void {
        const systemMsg = messages[0]?.content || "";
        this.logger.debug(`[chat] system prompt (${systemMsg.length} chars):\n${systemMsg}`);
    }

    /** freeform 模式 prompt 摘要 */
    logFreeformPrompt(messages: ChatMessage[]): void {
        const systemMsg = messages[0]?.content || "";
        this.logger.debug(`[chat] freeform prompt: ${systemMsg.substring(0, 200)}...`);
    }

    /** 完成耗时（debug 级别） */
    logCompletion(timing: CompletionTiming): void {
        this.logger.debug(`[chat] completed in ${timing.total}ms (fetch=${timing.fetch}ms, llm=${timing.llm}ms)`);
    }

    /** freeform 模式完成（debug 级别） */
    logFreeformCompletion(total: number, llm: number): void {
        this.logger.debug(`[chat] freeform completed in ${total}ms (llm=${llm}ms)`);
    }

    /** 异常 */
    logError(elapsed: number, error: unknown, question?: string): void {
        const q = question ? ` question="${question.substring(0, 100)}"` : "";
        this.logger.error(`[chat] error after ${elapsed}ms:${q} → ${(error as Error).message}`);
    }
}
