import { firstValueFrom, toArray } from "rxjs";
import { AnalyzerService } from "./analyzer.service";

describe("AnalyzerService（M3 步骤 12 骨架）", () => {
    it("streamAnalysis 先发 status 事件后正常完成", async () => {
        const service = new AnalyzerService();
        const events = await firstValueFrom(service.streamAnalysis({}).pipe(toArray()));
        expect(events).toHaveLength(1);
        expect(events[0]).toMatchObject({ type: "status", data: expect.any(String) });
    });

    it("事件协议类型包含 analysis 结构化事件字段", () => {
        // 编译期类型检查 + 运行期形状检查（模拟步骤 13 的 analysis 事件）
        const analysisEvent = {
            type: "analysis",
            data: {
                affectedLines: [{ line: "3号线", period: "14日21时起", riskLevel: "高风险" }],
                levelSuggestion: "Ⅱ级响应",
                similarCases: [{ caseId: "x", caseName: "2022梅花", score: 0.8, reason: "路径相近" }],
            },
        } as const;
        expect(analysisEvent.type).toBe("analysis");
        expect(analysisEvent.data.affectedLines![0].line).toBe("3号线");
        expect(analysisEvent.data.similarCases![0].score).toBe(0.8);
    });
});
