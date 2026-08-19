import { LineImpactService } from "./line-impact.service";

/** 构造 mock WindCircleService：state → [lat,lng] 风圈扇形（模拟 wind-circle 输出顺序） */
const buildWindCircleMock = (opts: { radiusKm?: number; centerLat?: number; centerLng?: number } = {}) => {
    const { radiusKm = 100, centerLat = 31.2, centerLng = 121.5 } = opts;
    const states: any[] = [
        {
            time: new Date("2022-09-14T12:00:00Z"),
            radius: [{ ne: radiusKm, se: radiusKm, sw: radiusKm, nw: radiusKm }],
            center: [centerLat, centerLng],
        },
        {
            time: new Date("2022-09-15T00:00:00Z"),
            radius: [{ ne: radiusKm, se: radiusKm, sw: radiusKm, nw: radiusKm }],
            center: [centerLat, centerLng],
        },
    ];
    // 四象限扇形（[lat, lng] 顺序，与 wind-circle generateSector 一致）；简化为围绕中心的方环
    const sector: number[][] = [
        [centerLat - 0.5, centerLng - 0.5],
        [centerLat + 0.5, centerLng - 0.5],
        [centerLat + 0.5, centerLng + 0.5],
        [centerLat - 0.5, centerLng + 0.5],
        [centerLat - 0.5, centerLng - 0.5],
    ];
    return {
        transformActiveTyphoonToPoints: jest.fn().mockReturnValue([{ time: "x", lng: "121.5", lat: "31.2" }]),
        transformPointsToStates: jest.fn().mockReturnValue(states),
        getTyphoonCircleFeature: jest.fn().mockReturnValue([sector, sector, sector, sector]),
    };
};

describe("LineImpactService（M4 步骤 16 风圈×线路）", () => {
    const lineThroughCenter: number[][][] = [
        [
            [121.3, 31.0],
            [121.5, 31.2],
            [121.7, 31.4],
        ],
    ];
    const lineFarAway: number[][][] = [[[130.0, 35.0], [131.0, 36.0]]];
    const branchLine: number[][][] = [
        [[121.3, 31.0], [121.5, 31.2]],
        [[121.5, 31.2], [121.7, 31.4]],
    ];

    it("风圈内的线路 → 受影响（含时间窗口），风圈外的线路不受影响", () => {
        const service = new LineImpactService(buildWindCircleMock() as any);
        (service as any).lineStrings = { "1号线": lineThroughCenter, "远线": lineFarAway };

        const result = service.analyze({ tracks: [] });
        expect(result.map(r => r.line)).toEqual(["1号线"]);
        expect(result[0]).toMatchObject({
            line: "1号线",
            affected: true,
            hitCount: 2,
        });
        expect(result[0].windowStart!.toISOString()).toBe("2022-09-14T12:00:00.000Z");
        expect(result[0].windowEnd!.toISOString()).toBe("2022-09-15T00:00:00.000Z");
    });

    it("多段线路（分支）任一段相交即算受影响", () => {
        const service = new LineImpactService(buildWindCircleMock() as any);
        (service as any).lineStrings = { "分支线": branchLine };
        const result = service.analyze({ tracks: [{ lon: "121.5", lat: "31.2" }] });
        expect(result).toHaveLength(1);
        expect(result[0].line).toBe("分支线");
    });

    it("无风圈半径的状态 → 跳过，返回空", () => {
        const mock = buildWindCircleMock();
        mock.transformPointsToStates.mockReturnValue([{ time: new Date(), radius: [{ ne: 0, se: 0, sw: 0, nw: 0 }] }]);
        const service = new LineImpactService(mock as any);
        (service as any).lineStrings = { "1号线": lineThroughCenter };
        expect(service.analyze({ points: [] })).toEqual([]);
    });

    it("空轨迹 → 返回空", () => {
        const mock = buildWindCircleMock();
        mock.transformPointsToStates.mockReturnValue([]);
        const service = new LineImpactService(mock as any);
        (service as any).lineStrings = { "1号线": lineThroughCenter };
        expect(service.analyze({ points: [] })).toEqual([]);
    });

    it("onModuleInit 从真实资产加载 21 条线（lineStrings → [lng,lat]）", async () => {
        const service = new LineImpactService(buildWindCircleMock() as any);
        await service.onModuleInit();
        const lines = service.getLoadedLines();
        expect(lines).toHaveLength(21);
        expect(lines).toContain("机场联络线");
        const seg = (service as any).lineStrings["1号线"][0][0];
        expect(Array.isArray(seg)).toBe(true);
        expect(seg[0]).toBeGreaterThan(120); // lng 在前
        expect(seg[1]).toBeGreaterThan(30); // lat 在后
    });
});
