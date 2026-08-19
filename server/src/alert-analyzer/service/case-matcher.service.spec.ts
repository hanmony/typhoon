import { CaseMatcherService, computeTrackSimilarity, haversineKm, parseWindMps } from "./case-matcher.service";

describe("case-matcher 纯函数", () => {
    it("haversineKm：同点距离 0，上海-东京约 1760km", () => {
        expect(haversineKm(121.47, 31.23, 121.47, 31.23)).toBe(0);
        const d = haversineKm(121.47, 31.23, 139.69, 35.68); // 上海→东京
        expect(d).toBeGreaterThan(1600);
        expect(d).toBeLessThan(1900);
    });

    it("parseWindMps：解析米/秒，无法解析返回 null", () => {
        expect(parseWindMps("18米/秒,8级")).toBe(18);
        expect(parseWindMps("40米/秒")).toBe(40);
        expect(parseWindMps("5级")).toBeNull();
        expect(parseWindMps("")).toBeNull();
        expect(parseWindMps(null)).toBeNull();
    });

    it("computeTrackSimilarity：相同路径 → 平均最近距离 0、分数 1", () => {
        const track = [
            { longitude: 130, latitude: 20, power: "18米/秒,8级" },
            { longitude: 128, latitude: 24, power: "30米/秒,11级" },
            { longitude: 125, latitude: 28, power: "25米/秒,10级" },
            { longitude: 122, latitude: 31, power: "20米/秒,9级" },
        ];
        const sim = computeTrackSimilarity(track, track);
        expect(sim.meanNearestKm).toBe(0);
        expect(sim.landfallKm).toBe(0);
        expect(sim.score).toBe(1);
    });

    it("computeTrackSimilarity：相距很远的两段路径 → 低分", () => {
        const trackA = [
            { longitude: 130, latitude: 20, power: "18米/秒,8级" },
            { longitude: 128, latitude: 24, power: "30米/秒,11级" },
        ];
        const trackB = [
            { longitude: -60, latitude: 15, power: "18米/秒,8级" },
            { longitude: -62, latitude: 18, power: "30米/秒,11级" },
        ];
        const sim = computeTrackSimilarity(trackA, trackB);
        expect(sim.score).toBeLessThan(0.2);
    });

    it("computeTrackSimilarity：空路径 → 分数 0", () => {
        const sim = computeTrackSimilarity([], [{ longitude: 130, latitude: 20 }]);
        expect(sim.score).toBe(0);
    });
});

describe("CaseMatcherService.match", () => {
    const buildRepo = (overrides: any = {}) => {
        const lean = (data: any[]) => ({ lean: jest.fn().mockResolvedValue(data) });
        const CID1 = "6a83f4ec915c23b1ea3693b1";
        const CID2 = "6a83f4ed915c23b1ea3695da";
        return {
            cases: { find: jest.fn().mockReturnValue(lean([
                { _id: CID1, name: "2022梅花", status: 0 },
                { _id: CID2, name: "2021烟花", status: 0 },
            ])) },
            pathInfos: { find: jest.fn().mockReturnValue({ sort: jest.fn().mockReturnValue(lean([
                // 2022梅花：与当前路径一致
                { caseId: "2022梅花", longitude: 130, latitude: 20, time: new Date("2022-09-08"), power: "18米/秒,8级" },
                { caseId: "2022梅花", longitude: 128, latitude: 24, time: new Date("2022-09-09"), power: "30米/秒,11级" },
                // 2021烟花：路径整体东移 20 度（很远）
                { caseId: "2021烟花", longitude: 150, latitude: 20, time: new Date("2021-07-20"), power: "18米/秒,8级" },
                { caseId: "2021烟花", longitude: 148, latitude: 24, time: new Date("2021-07-21"), power: "30米/秒,11级" },
                // 无案例记录的路径（应被跳过）
                { caseId: "201908利奇马", longitude: 130, latitude: 20, time: new Date("2019-08-01"), power: "18米/秒,8级" },
            ])) }) },
            actions: { find: jest.fn().mockReturnValue(lean([
                { caseId: CID1, category: "预警发布及响应", fromDate: new Date("2022-09-13"), items: { 预警发布: "发布台风蓝色预警" } },
                { caseId: CID1, category: "线路行车措施", fromDate: new Date("2022-09-14"), items: { 线路名称: "3号线", 调整内容: "高架段限速60km/h" } },
                { caseId: CID2, category: "客运措施", fromDate: new Date("2021-07-25"), items: { 工作要点: "组织乘客疏散" } },
            ])) },
            ...overrides,
        };
    };

    it("返回 Top-N 且按分数降序；无案例的路径被跳过", async () => {
        const service = new CaseMatcherService(buildRepo() as any);
        const current = [
            { longitude: 130, latitude: 20, power: "18米/秒,8级" },
            { longitude: 128, latitude: 24, power: "30米/秒,11级" },
        ];
        const result = await service.match(current, 3);

        expect(result).toHaveLength(2); // 利奇马无案例被排除
        expect(result[0].caseName).toBe("2022梅花");
        expect(result[0].score).toBeGreaterThan(result[1].score);
        expect(result[0].pathPointCount).toBe(2);
        expect(result[0].timeline).toEqual(
            expect.arrayContaining([
                expect.objectContaining({ category: "预警发布及响应", count: 1 }),
            ]),
        );
        // summary 引用关键类别
        expect(result[0].summary.some(s => s.includes("预警发布及响应"))).toBe(true);
        expect(result[0].summary.some(s => s.includes("线路行车措施"))).toBe(true);
    });

    it("当前路径为空 → 返回空数组", async () => {
        const service = new CaseMatcherService(buildRepo() as any);
        const result = await service.match([], 3);
        expect(result).toEqual([]);
    });

    it("兼容 lng/lat 字符串输入", async () => {
        const service = new CaseMatcherService(buildRepo() as any);
        const current = [{ lng: "130", lat: "20" }, { lng: "128", lat: "24" }];
        const result = await service.match(current, 3);
        expect(result[0].caseName).toBe("2022梅花");
    });
});
