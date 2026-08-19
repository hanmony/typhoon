import { firstValueFrom, of, throwError, toArray } from "rxjs";
import { AnalyzerService } from "./analyzer.service";
import { buildAnalyzerMessages } from "./analyzer.prompt";

const makeTyphoonDoc = (overrides: any = {}) => ({
    tfid: "202212",
    name: "梅花",
    name_en: "Muifa",
    tracks: [
        { lat: "20", lon: "130", wind_speed: "20", wind_class: "8级", data_time: "2022-09-08 08:00:00" },
        { lat: "24", lon: "128", wind_speed: "30", wind_class: "11级", data_time: "2022-09-09 08:00:00" },
    ],
    ...overrides,
});

const makeCaseResult = (overrides: any = {}) => ({
    caseId: "case-1",
    caseName: "2022梅花",
    score: 1,
    meanNearestKm: 0,
    landfallKm: 0,
    pathPointCount: 2,
    reason: "路径平均最近距离 0.0km，最强时刻相距 0.0km",
    timeline: [{ category: "线路行车措施", count: 2, samples: ["线路名称：3号线；调整内容：限速"] }],
    summary: ["2022-09-14 【预警发布及响应】发布台风蓝色预警"],
    ...overrides,
});

const buildService = (overrides: any = {}) => {
    const repo = {
        typhoonTwos: {
            findOne: jest.fn().mockReturnValue({ exec: jest.fn().mockResolvedValue(makeTyphoonDoc()) }),
        },
        ...(overrides.repo || {}),
    };
    const typhoonService = {
        getCommandTyphoon: jest.fn().mockResolvedValue(null),
        ...(overrides.typhoonService || {}),
    };
    const caseMatcher = {
        match: jest.fn().mockResolvedValue([makeCaseResult()]),
        ...(overrides.caseMatcher || {}),
    };
    const llmService = {
        chatStream: jest.fn().mockReturnValue(of({ type: "token", data: "研判报告内容" })),
        ...(overrides.llmService || {}),
    };
    const lineImpact = {
        analyzeStates: jest.fn().mockImplementation((_states, options) => {
            // 16号线：7级和12级命中（→ 高风险）；1号线：仅7级命中（→ 可能受影响）
            if (options?.radiusIndex === 1) return [];
            if (options?.radiusIndex === 2) return [{ line: "16号线", affected: true, hitCount: 1, windLevel: 12 }];
            return [
                { line: "1号线", affected: true, hitCount: 2, windLevel: 7 },
                { line: "16号线", affected: true, hitCount: 2, windLevel: 7 },
            ];
        }),
        ...(overrides.lineImpact || {}),
    };
    const windCircle = {
        transformActiveTyphoonToPoints: jest.fn().mockReturnValue([{ time: "x", lng: "121.5", lat: "31.2" }]),
        transformPointsToStates: jest
            .fn()
            .mockReturnValue([{ time: new Date(), center: [31.2, 121.5], radius: [{ ne: 100, se: 100, sw: 100, nw: 100 }] }]),
        getPredictPath: jest.fn().mockReturnValue([]),
        ...(overrides.windCircle || {}),
    };
    return {
        service: new AnalyzerService(
            llmService as any,
            caseMatcher as any,
            typhoonService as any,
            repo as any,
            lineImpact as any,
            windCircle as any,
        ),
        mocks: { repo, typhoonService, caseMatcher, llmService, lineImpact, windCircle },
    };
};

const collectOrError = (obs: any) =>
    firstValueFrom(obs.pipe(toArray())).catch(err => [{ error: err.message }]);

describe("AnalyzerService（M3 步骤 13 + M4 步骤 17 编排）", () => {
    it("完整流水线：status×3 → analysis（相似案例 + affectedLines）→ status → token → 完成", async () => {
        const { service, mocks } = buildService();
        const events = await firstValueFrom(service.streamAnalysis({ tfid: "202212" }).pipe(toArray()));

        const types = events.map(e => e.type);
        expect(types).toEqual(["status", "status", "status", "analysis", "status", "token"]);

        const analysis = events.find(e => e.type === "analysis") as any;
        expect(analysis.data.similarCases).toHaveLength(1);
        expect(analysis.data.similarCases[0]).toMatchObject({ caseName: "2022梅花", score: 1 });
        // 线路影响：16号线 12级→高风险、1号线 仅7级→可能受影响（分级取最高等级）
        expect(analysis.data.affectedLines).toEqual([
            { line: "16号线", period: expect.any(String), riskLevel: "高风险（12级风圈）" },
            { line: "1号线", period: expect.any(String), riskLevel: "可能受影响（7级风圈）" },
        ]);
        // 实时模式走 getPredictPath（预报状态）+ analyzeStates 分级
        expect(mocks.windCircle.getPredictPath).toHaveBeenCalled();
        expect(mocks.lineImpact.analyzeStates).toHaveBeenCalledTimes(3);
    });

    it("未找到当前台风 → error 事件（不静默完成）", async () => {
        const { service } = buildService({
            repo: { typhoonTwos: { findOne: jest.fn().mockReturnValue({ exec: jest.fn().mockResolvedValue(null) }) } },
            typhoonService: { getCommandTyphoon: jest.fn().mockResolvedValue(null) },
        });
        const events = await collectOrError(service.streamAnalysis({}));
        expect(events[0]).toMatchObject({ error: expect.stringContaining("未找到当前台风") });
    });

    it("轨迹为空 → error 事件", async () => {
        const { service } = buildService({
            repo: {
                typhoonTwos: {
                    findOne: jest.fn().mockReturnValue({ exec: jest.fn().mockResolvedValue(makeTyphoonDoc({ tracks: [] })) }),
                },
            },
        });
        const events = await collectOrError(service.streamAnalysis({ tfid: "202212" }));
        expect(events[0]).toMatchObject({ error: expect.stringContaining("轨迹为空") });
    });

    it("LLM 流错误 → error 事件", async () => {
        const { service } = buildService({
            llmService: { chatStream: jest.fn().mockReturnValue(throwError(() => new Error("LLM 超时"))) },
        });
        const events = await collectOrError(service.streamAnalysis({ tfid: "202212" }));
        expect(events[0]).toMatchObject({ error: "LLM 超时" });
    });

    it("事件协议 analysis 结构化字段形状", () => {
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

describe("buildAnalyzerMessages（防编造 prompt）", () => {
    it("system 含防编造规则与相似案例上下文，user 用默认指令", () => {
        const messages = buildAnalyzerMessages(
            { name: "梅花", tfid: "202212", tracks: [{ lat: "24", lon: "128", wind_speed: "30" }] },
            [makeCaseResult()],
            [{ line: "16号线", period: "09-14 04:00 ~ 09-15 04:00", riskLevel: "高风险（12级风圈）" }],
            undefined,
        );
        expect(messages).toHaveLength(2);
        expect(messages[0].role).toBe("system");
        expect(messages[0].content).toContain("严禁编造");
        expect(messages[0].content).toContain("2022梅花");
        expect(messages[0].content).toContain("相似度 1");
        expect(messages[0].content).toContain("16号线");
        expect(messages[0].content).toContain("不得据此直接建议停运");
        expect(messages[1].role).toBe("user");
        expect(messages[1].content).toContain("研判");
    });

    it("传入 question 时 user 用自定义问题；无相似案例/无线路影响时明确说明", () => {
        const messages = buildAnalyzerMessages({ name: "未知台风", tfid: "x" }, [], [], "3号线会停运吗？");
        expect(messages[0].content).toContain("没有可参考的历史案例");
        expect(messages[0].content).toContain("不足以判定线路影响");
        expect(messages[1].content).toBe("3号线会停运吗？");
    });
});
describe("AnalyzerService review boundaries", () => {
    it("autoRun=false skips LLM", async () => {
        const { service, mocks } = buildService();
        const events = await firstValueFrom(service.streamAnalysis({ tfid: "202212", autoRun: false }).pipe(toArray()));
        expect(events.some(e => e.type === "analysis")).toBe(true);
        expect(mocks.llmService.chatStream).not.toHaveBeenCalled();
    });

    it("explicit missing tfid does not fall back to command typhoon", async () => {
        const { service, mocks } = buildService({
            repo: { typhoonTwos: { findOne: jest.fn().mockReturnValue({ exec: jest.fn().mockResolvedValue(null) }) } },
            typhoonService: { getCommandTyphoon: jest.fn().mockResolvedValue(makeTyphoonDoc()) },
        });
        const events = await collectOrError(service.streamAnalysis({ tfid: "missing" }));
        expect(events[0]).toMatchObject({ error: expect.any(String) });
        expect(mocks.typhoonService.getCommandTyphoon).not.toHaveBeenCalled();
    });
});
