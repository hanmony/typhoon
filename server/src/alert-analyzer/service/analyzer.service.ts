import { Injectable } from "@nestjs/common";
import { Observable } from "rxjs";
import { AlertAnalyzerDto } from "../domain/alert-analyzer.dto";
import { AnalyzerEvent } from "../domain/alert-analyzer.types";

/**
 * 研判编排服务（M3 步骤 13 实现完整流水线；步骤 12 为骨架验证版）
 *
 * 步骤 13 计划流水线：
 *  1. 聚合上下文（当前台风轨迹、预警/指挥信息）
 *  2. case-matcher 匹配相似历史案例（Top-N）
 *  3. 组装防编造 prompt（analyzer.prompt.ts）
 *  4. LlmService 流式生成 → 透传 thinking/token/usage
 *  5. 先发 analysis 结构化事件（研判卡片），再流式输出报告文字
 */
@Injectable()
export class AnalyzerService {
    /** 研判 SSE 流 */
    streamAnalysis(_dto: AlertAnalyzerDto): Observable<AnalyzerEvent> {
        return new Observable(subscriber => {
            subscriber.next({ type: "status", data: "研判编排将在 M3 步骤 13 接入" });
            subscriber.complete();
        });
    }
}
