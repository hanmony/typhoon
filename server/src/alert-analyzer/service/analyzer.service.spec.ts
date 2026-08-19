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
            // 16号线最高12级、2号线最高10级、1号线仅7级；7级窗口是完整影响窗口。
            if (options?.radiusIndex === 2)
                return [
                    {
                        line: "16号线",
                        affected: true,
                        hitCount: 1,
                        windLevel: 12,
                        windowStart: new Date(2022, 8, 14, 16),
                        windowEnd: new Date(2022, 8, 14, 16),
                    },
                ];
            if (options?.radiusIndex === 1)
                return [
                    {
                        line: "2号线",
                        affected: true,
                        hitCount: 2,
                        windLevel: 10,
                        windowStart: new Date(2022, 8, 14, 10),
                        windowEnd: new Date(2022, 8, 14, 18),
                    },
                ];
            return [
                {
                    line: "1号线",
                    affected: true,
                    hitCount: 2,
                    windLevel: 7,
                    windowStart: new Date(2022, 8, 14, 4),
                    windowEnd: new Date(2022, 8, 15, 4),
                },
                {
                    line: "2号线",
                    affected: true,
                    hitCount: 2,
                    windLevel: 7,
                    windowStart: new Date(2022, 8, 14, 5),
                    windowEnd: new Date(2022, 8, 15, 3),
                },
                {
                    line: "16号线",
                    affected: true,
                    hitCount: 2,
                    windLevel: 7,
                    windowStart: new Date(2022, 8, 14, 4),
                    windowEnd: new Date(2022, 8, 15, 4),
                },
            ];
        }),
        ...(overrides.lineImpact || {}),
    };
    const historicalStates = [
        { time: new Date(2022, 8, 13, 8), center: [28, 125], radius: [] },
        { time: new Date(2022, 8, 14, 8), center: [30, 122], radius: [] },
    ];
    const futureStates = [{ time: new Date(2022, 8, 14, 11), center: [31, 121.5], radius: [] }];
    const windCircle = {
        transformActiveTyphoonToPoints: jest.fn().mockReturnValue([{ time: "x", lng: "121.5", lat: "31.2" }]),
        transformPointsToStates: jest.fn().mockReturnValue(historicalStates),
        getPredictPath: jest.fn().mockReturnValue(futureStates),
        calcSimulateTime: jest.fn().mockReturnValue(new Date(2022, 8, 14, 8)),
        ...(overrides.windCircle || {}),
    };
    const typhoonCommand = {
        getCurrentCommand: jest.fn().mockResolvedValue(null),
        ...(overrides.typhoonCommand || {}),
    };
    return {
        service: new AnalyzerService(
            llmService as any,
            caseMatcher as any,
            typhoonService as any,
            repo as any,
            lineImpact as any,
            windCircle as any,
            typhoonCommand as any,
        ),
        mocks: { repo, typhoonService, caseMatcher, llmService, lineImpact, windCircle, typhoonCommand },
    };
};

const collectOrError = (obs: any) => firstValueFrom(obs.pipe(toArray())).catch(err => [{ error: err.message }]);

describe("AnalyzerService（M3 步骤 13 + M4 步骤 17 编排）", () => {
    it("完整流水线：status×3 → analysis（相似案例 + affectedLines）→ status → token → 完成", async () => {
        const { service, mocks } = buildService();
        const events = await firstValueFrom(service.streamAnalysis({ tfid: "202212" }).pipe(toArray()));

        const types = events.map(e => e.type);
        expect(types).toEqual(["status", "status", "status", "analysis", "status", "token"]);

        const analysis = events.find(e => e.type === "analysis") as any;
        expect(analysis.data.similarCases).toHaveLength(1);
        expect(analysis.data.similarCases[0]).toMatchObject({ caseName: "2022梅花", score: 1 });
        // 线路影响：最高等级优先，并以7级窗口保留完整影响期。
        expect(analysis.data.affectedLines).toEqual([
            {
                line: "16号线",
                period: "09-14 04:00 ~ 09-15 04:00",
                riskLevel: "最高空间风险：高（12级风圈）",
            },
            {
                line: "2号线",
                period: "09-14 05:00 ~ 09-15 03:00",
                riskLevel: "最高空间风险：中（10级风圈）",
            },
            {
                line: "1号线",
                period: "09-14 04:00 ~ 09-15 04:00",
                riskLevel: "可能受影响（仅7级风圈）",
            },
        ]);
        // 实时模式只分析“最新当前状态 + forecasts”，不得把整段历史并入预计窗口。
        expect(mocks.windCircle.getPredictPath).toHaveBeenCalledWith(
            { points: expect.any(Array) },
            false,
            expect.any(Date),
        );
        expect(mocks.lineImpact.analyzeStates).toHaveBeenCalledTimes(3);
        const historical = mocks.windCircle.transformPointsToStates.mock.results[0].value;
        const future = mocks.windCircle.getPredictPath.mock.results[0].value;
        expect(mocks.lineImpact.analyzeStates.mock.calls[0][0]).toEqual([historical[1], future[0]]);
        expect(mocks.lineImpact.analyzeStates.mock.calls.map(call => call[1].radiusIndex)).toEqual([2, 1, 0]);
    });

    it("未找到当前台风 → error 事件（不静默完成）", async () => {
        const { service } = buildService({
            repo: { typhoonTwos: { findOne: jest.fn().mockReturnValue({ exec: jest.fn().mockResolvedValue(null) }) } },
            typhoonService: { getCommandTyphoon: jest.fn().mockResolvedValue(null) },
        });
        const events = await collectOrError(service.streamAnalysis({}));
        expect(events[0]).toMatchObject({ error: expect.stringContaining("未找到当前台风") });
    });

    it("模拟指挥使用模拟 queryTime 和后续轨迹，不按真实当前时间计算", async () => {
        const simulatedQueryTime = new Date(2022, 8, 14, 8);
        const simulatedStates = [
            { time: simulatedQueryTime, center: [30, 122], radius: [] },
            { time: new Date(2022, 8, 14, 11), center: [31, 121.5], radius: [] },
        ];
        const { service, mocks } = buildService({
            typhoonService: { getCommandTyphoon: jest.fn().mockResolvedValue(makeTyphoonDoc()) },
            typhoonCommand: {
                getCurrentCommand: jest.fn().mockResolvedValue({
                    name: "梅花",
                    isSimulated: 1,
                    simulateStartTime: new Date(2022, 8, 8, 8),
                    startTime: new Date(2026, 7, 19, 8),
                }),
            },
            windCircle: {
                calcSimulateTime: jest.fn().mockReturnValue(simulatedQueryTime),
                getPredictPath: jest.fn().mockReturnValue(simulatedStates),
            },
        });

        await firstValueFrom(service.streamAnalysis({ tfid: "202212", autoRun: false }).pipe(toArray()));

        expect(mocks.windCircle.getPredictPath).toHaveBeenCalledWith(
            { points: expect.any(Array) },
            true,
            simulatedQueryTime,
        );
        expect(mocks.lineImpact.analyzeStates.mock.calls[0][0]).toEqual(simulatedStates);
    });

    it("预报路径异常时只降级到最新当前状态，不把整段历史伪装成未来窗口", async () => {
        const { service, mocks } = buildService({
            windCircle: {
                getPredictPath: jest.fn().mockImplementation(() => {
                    throw new Error("forecast failed");
                }),
            },
        });

        const events = await firstValueFrom(service.streamAnalysis({ tfid: "202212", autoRun: false }).pipe(toArray()));

        expect(events.some(event => event.type === "analysis")).toBe(true);
        const historical = mocks.windCircle.transformPointsToStates.mock.results[0].value;
        expect(mocks.lineImpact.analyzeStates.mock.calls[0][0]).toEqual([historical[historical.length - 1]]);
    });

    it("轨迹为空 → error 事件", async () => {
        const { service } = buildService({
            repo: {
                typhoonTwos: {
                    findOne: jest
                        .fn()
                        .mockReturnValue({ exec: jest.fn().mockResolvedValue(makeTyphoonDoc({ tracks: [] })) }),
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
            [
                {
                    line: "16号线",
                    period: "09-14 04:00 ~ 09-15 04:00",
                    riskLevel: "最高空间风险：高（12级风圈）",
                },
            ],
            undefined,
        );
        expect(messages).toHaveLength(2);
        expect(messages[0].role).toBe("system");
        expect(messages[0].content).toContain("严禁编造");
        expect(messages[0].content).toContain("2022梅花");
        expect(messages[0].content).toContain("相似度 1");
        expect(messages[0].content).toContain("16号线");
        expect(messages[0].content).toContain("任何风圈等级都不得直接推出停运结论");
        expect(messages[0].content).toContain("未知/需现场核实");
        expect(messages[1].role).toBe("user");
        expect(messages[1].content).toContain("研判");
    });

    it("传入 question 时 user 用自定义问题；无相似案例/无线路影响时明确说明", () => {
        const messages = buildAnalyzerMessages({ name: "未知台风", tfid: "x" }, [], [], "3号线会停运吗？");
        expect(messages[0].content).toContain("没有可参考的历史案例");
        expect(messages[0].content).toContain("不得据此断言线路一定不受影响");
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
