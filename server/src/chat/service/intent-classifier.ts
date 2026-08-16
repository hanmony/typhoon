/**
 * IntentClassifier -- 意图分类（关键词优先 + LLM fallback）
 *
 * 根据用户消息判断需要查询哪些数据源，返回分类结果。
 */
import { Injectable, Logger } from "@nestjs/common";
import { LlmService, ChatMessage, ChatResult } from "src/llm";
import { KbCatalogCache } from "src/knowledge-base";
import { ChatHistoryItem } from "../domain/dto/chat.dto";

/** 可扩展的数据源定义 */
const SOURCE_DESCRIPTIONS: Record<string, string> = {
    alert: "台风实时数据（台风位置、风圈、预警、气象、登陆预测）",
    rag: "防汛知识库（预案、应急措施、历史案例、管理规定、决策建议）",
    "command-active": "当前活跃的指挥事件和运营调整（正在进行中的事件、未结束的运营调整）",
    "command-all": "本次指挥的所有事件和运营调整（包含已结束的全部记录）",
};

/** 合法数据源 key 列表 */
export const VALID_SOURCES = Object.keys(SOURCE_DESCRIPTIONS);

/** 意图分类结果 */
export interface IntentResult {
    /** 需要查询的数据源 key 列表 */
    sources: string[];
    /** LLM 分类结果（仅当走了 LLM fallback 时有值） */
    chatResult?: ChatResult;
}

@Injectable()
export class IntentClassifier {
    private readonly logger = new Logger(IntentClassifier.name);

    constructor(
        private readonly llmService: LlmService,
        private readonly catalogCache: KbCatalogCache,
    ) {}

    /**
     * 对用户消息进行意图分类。
     * 策略：关键词快速匹配优先 → 闲聊检测 → LLM 分类降级
     */
    async classify(question: string, history?: ChatHistoryItem[]): Promise<IntentResult> {
        // 1. 关键词快速匹配（<10ms）
        const keywordSources = this.classifyByKeywords(question);
        if (keywordSources.length > 0) {
            return { sources: keywordSources };
        }

        // 2. 明显闲聊 → 跳过 LLM
        if (this.isConversational(question)) {
            return { sources: [] };
        }

        // 3. 模糊查询 → LLM 分类（带 history）
        try {
            return await this.classifyByLlm(question, history);
        } catch (err) {
            this.logger.warn(`LLM intent classification failed: ${(err as Error).message}`);
            return { sources: [] };
        }
    }

    /** 根据 from 过滤不可用的数据源 */
    filterSources(sources: string[], from?: string): string[] {
        if (from === "library") {
            return sources.filter(s => s === "rag");
        }
        return sources;
    }

    // ─── 关键词匹配 ──────────────────────────────────────────────

    private classifyByKeywords(q: string): string[] {
        const has = (kws: string[]) => kws.some(kw => q.includes(kw));
        const alert = has(["台风", "风圈", "预警", "气象", "暴雨", "大风", "天气", "登陆", "预测"]);
        const hardcodedRagKeywords = [
            "影响",
            "预案",
            "应急",
            "历史",
            "案例",
            "规定",
            "怎么做",
            "建议",
            "措施",
            "处置",
            "决策",
        ];
        const dynamicTags = this.catalogCache.getAllTags();
        const ragKeywords = [...hardcodedRagKeywords, ...dynamicTags];
        const rag = has(ragKeywords);
        const commandActive = has(["当前", "现在", "进行中", "活跃", "正在", "未结束", "处理中", "抢修中"]);
        const commandAll = has(["所有", "全部", "总共", "历史", "一共", "累计", "多少条", "几次"]);
        const sources: string[] = [];
        if (alert) sources.push("alert");
        if (rag) sources.push("rag");
        if (commandAll) sources.push("command-all");
        else if (commandActive) sources.push("command-active");
        return sources;
    }

    // ─── 闲聊检测 ────────────────────────────────────────────────

    private isConversational(q: string): boolean {
        const trimmed = q.trim();
        if (trimmed.length <= 2) return true;
        return /^(你好|谢谢|感谢|再见|辛苦了?|好的|没问题|收到|嗯+|哦+|哈+)/.test(trimmed);
    }

    // ─── LLM 分类 ────────────────────────────────────────────────

    private async classifyByLlm(question: string, history?: ChatHistoryItem[]): Promise<IntentResult> {
        const sourceEntries = Object.entries(SOURCE_DESCRIPTIONS);
        const sourceList = sourceEntries.map(([key, desc]) => `- ${key}: ${desc}`).join("\n");
        const examples = this.getClassificationExamples();

        let contextBlock = "";
        if (history?.length) {
            const recent = history.slice(-2); // 最近 1 轮（user + assistant）
            contextBlock = `\n\n对话上下文：\n${recent.map(h => `${h.role}: ${h.content}`).join("\n")}`;
        }

        const messages: ChatMessage[] = [
            {
                role: "system",
                content: `你是意图分类器。根据用户问题判断需要哪些数据源。

可用数据源：
${sourceList}

分类规则：
${examples}
${contextBlock}

只返回 JSON 数组，不要其他内容。例如: ["alert"] 或 ["alert","rag"] 或 []`,
            },
            { role: "user", content: question },
        ];

        const chatResult = await this.llmService.chat(messages);
        const parsed = this.parseClassificationResult(chatResult.content);

        return { sources: parsed.filter(s => VALID_SOURCES.includes(s)), chatResult };
    }

    private getClassificationExamples(): string {
        return `示例：
- "台风现在到哪了" → ["alert"]
- "台风来了怎么办" → ["alert","rag"]
- "最近天气怎么样" → ["alert"]
- "七级风圈会影响上海吗" → ["alert"]
- "应急预案怎么做" → ["rag"]
- "历史上有类似的台风吗" → ["rag"]
- "防汛有哪些规定" → ["rag"]
- "风圈还有多久到上海" → ["alert"]
- "那风圈呢？"（上下文：台风当前位置） → ["alert"]
- "现在有哪些事件" → ["command-active"]
- "目前运营调整情况怎么样" → ["command-active"]
- "当前有什么活跃的事件和运营调整" → ["command-active"]
- "本次指挥一共发生了多少事件" → ["command-all"]
- "所有运营调整记录" → ["command-all"]
- "历史事件汇总" → ["command-all"]
- "现在台风情况和事件汇总" → ["alert", "command-active"]
- "你好" → []
- "帮我写个报告" → []
- "今天星期几" → []`;
    }

    private parseClassificationResult(result: string): string[] {
        const trimmed = result.trim();
        const jsonMatch = trimmed.match(/\[[\s\S]*?\]/);
        if (jsonMatch) {
            try {
                const parsed = JSON.parse(jsonMatch[0]);
                if (Array.isArray(parsed)) {
                    return parsed.filter(item => typeof item === "string");
                }
            } catch {
                // JSON 解析失败
            }
        }
        throw new Error(`Failed to parse classification result: ${trimmed}`);
    }
}
