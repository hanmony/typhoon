/**
 * AI 研判 SSE 事件协议（M3 步骤 12）
 *
 * 沿用平台 typed 事件格式（与 LlmStreamEvent 的 thinking/token/usage 命名一致），
 * 新增两个研判专用事件：
 *  - status：流水线进度（"正在研判线路影响…"）
 *  - analysis：结构化研判卡片（前端渲染线路列表/等级建议/相似案例）
 *
 * 事件流示例：
 *   data: {"type":"status","data":"正在匹配历史相似案例…"}
 *   data: {"type":"analysis","data":{affectedLines:[...],levelSuggestion:"...",similarCases:[...]}}
 *   data: {"type":"thinking","data":"..."}
 *   data: {"type":"token","data":"..."}
 *   data: {"type":"usage","data":{prompt_tokens:1,completion_tokens:2,total_tokens:3}}
 *   data: [DONE]
 */

/** 受影响线路条目（M4 空间计算后填充；M3 阶段可为空/经验推断） */
export interface AnalysisLineImpact {
    /** 线路名（如"3号线"） */
    line: string;
    /** 预计影响时段（自由文本，如"14日21时起"） */
    period?: string;
    /** 风险等级建议（如"高风险/中风险/低风险"） */
    riskLevel?: string;
}

/** 相似历史案例条目（由 case-matcher 提供） */
export interface AnalysisSimilarCase {
    caseId: string;
    caseName: string;
    /** 综合相似度 0..1 */
    score: number;
    /** 判定说明（路径距离/最强时刻距离） */
    reason?: string;
}

/** analysis 事件的结构化数据（研判卡片） */
export interface AnalysisPayload {
    /** 受影响线路 */
    affectedLines?: AnalysisLineImpact[];
    /** 应急响应等级建议（如"Ⅱ级响应"） */
    levelSuggestion?: string;
    /** 相似历史案例（Top-N） */
    similarCases?: AnalysisSimilarCase[];
}

/** 研判流事件联合类型 */
export type AnalyzerEvent =
    | { type: "status"; data: string }
    | { type: "analysis"; data: AnalysisPayload }
    | { type: "thinking"; data: string }
    | { type: "token"; data: string }
    | { type: "usage"; data: { prompt_tokens: number; completion_tokens: number; total_tokens: number } };
