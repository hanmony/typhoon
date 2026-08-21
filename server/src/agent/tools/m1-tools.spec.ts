import { AgentService } from "../agent.service";
import { GetDutyInfoTool } from "./get-duty-info.tool";
import { GetMessagesTool } from "./get-messages.tool";
import { GetPatrollingToursTool } from "./get-patrolling-tours.tool";
import { GetSevereWeatherHistoryTool } from "./get-severe-weather-history.tool";
import { GetTyphoonHistoryTool } from "./get-typhoon-history.tool";

const parseData = (result: { data: string }) => JSON.parse(result.data);

describe("M1 agent tools", () => {
    it("summarizes one requested typhoon and returns a sampled path", async () => {
        const tracks = Array.from({ length: 12 }, (_, index) => ({
            data_time: `2024-09-0${Math.min(index + 1, 9)} 00:00`,
            lat: `${20 + index}`,
            lon: `${120 + index}`,
            wind_speed: `${20 + index}`,
            wind_class: `${8 + index}`,
            level: "TS",
            pressure: `${1000 - index}`,
            ck_position: "test",
        }));
        const tool = new GetTyphoonHistoryTool({
            getHistory: jest.fn().mockResolvedValue([
                { tfid: "2401", name: "A", name_en: "A", tracks, forecasts: [], lands: [] },
                { tfid: "2402", name: "B", name_en: "B", tracks: [], forecasts: [], lands: [] },
            ]),
        } as any);

        const result = await tool.execute({ year: 2024, tfid: "2401" });
        const data = parseData(result);

        expect(result.success).toBe(true);
        expect(data.count).toBe(1);
        expect(data.typhoons[0].tfid).toBe("2401");
        expect(data.typhoons[0].path.pointCount).toBe(12);
        expect(data.typhoons[0].path.overview).toHaveLength(8);
        expect(data.typhoons[0].peak.max_wind.wind_speed).toBe("31");
        expect(data.typhoons[0].peak.min_pressure.pressure).toBe("989");
    });

    it("returns an explicit no-data message for a missing typhoon", async () => {
        const tool = new GetTyphoonHistoryTool({ getHistory: jest.fn().mockResolvedValue([]) } as any);
        const result = await tool.execute({ year: 2024 });

        expect(result.success).toBe(true);
        expect(parseData(result).message).toBeTruthy();
    });

    it("filters duty entries by date and reports unfilled departments", async () => {
        const tool = new GetDutyInfoTool({
            list: jest.fn().mockResolvedValue([
                { date: "2026-08-17", department: "A", responsible: "Alice" },
                { date: "2026-08-17", department: "B", responsible: "" },
                { date: "2026-08-18", department: "C", responsible: "Carol" },
            ]),
        } as any);

        const result = await tool.execute({ date: "2026-08-17" });
        const data = parseData(result);

        expect(result.success).toBe(true);
        expect(data.dates).toEqual([
            {
                date: "2026-08-17",
                duties: [{ department: "A", responsible: "Alice" }],
                unfilledCount: 1,
            },
        ]);
    });

    it("caps messages at 20 and truncates oversized content", async () => {
        const messages = Array.from({ length: 25 }, (_, index) => ({
            id: `${index}`,
            title: `message-${index}`,
            type: "notice",
            content: "x".repeat(220),
            lines: ["1号线"],
            createTime: new Date("2026-08-17T08:30:00+08:00"),
        }));
        const tool = new GetMessagesTool({ getAll: jest.fn().mockResolvedValue(messages) } as any);

        const result = await tool.execute({ limit: 100 });
        const data = parseData(result);

        expect(result.success).toBe(true);
        expect(data.count).toBe(20);
        expect(data.total).toBe(25);
        expect(data.messages[0].content.length).toBeGreaterThan(200);
        expect(data.messages[0].content.startsWith("x".repeat(200))).toBe(true);
        expect(data.messages[0].createTime).toBe("2026-08-17 08:30");
    });

    it("orders severe-weather history and maps CAP labels", async () => {
        const tool = new GetSevereWeatherHistoryTool({
            getSevereWeatherhistory: jest.fn().mockResolvedValue([
                {
                    weatherId: "later",
                    headline: "later alert",
                    issuedTime: new Date("2026-08-17T10:00:00+08:00"),
                    severity: "extreme",
                    messageType: { code: "cancel" },
                    eventType: { name: "Typhoon" },
                    isEnd: 1,
                },
                {
                    weatherId: "earlier",
                    headline: "earlier alert",
                    issuedTime: new Date("2026-08-17T09:00:00+08:00"),
                    severity: "minor",
                    messageType: { code: "new" },
                    eventType: { name: "Rain" },
                    isEnd: 0,
                },
            ]),
        } as any);

        const result = await tool.execute({});
        const data = parseData(result);

        expect(result.success).toBe(true);
        expect(data.alerts.map((alert: any) => alert.weatherId)).toEqual(["earlier", "later"]);
        expect(data.alerts[0].severity).toBe("蓝色");
        expect(data.alerts[0].type).toBe("发布");
        expect(data.alerts[1].severity).toBe("红色");
        expect(data.alerts[1].type).toBe("解除");
    });

    it("distinguishes no active command from a database failure for patrols", async () => {
        const noCommandTool = new GetPatrollingToursTool({
            getTours: jest.fn().mockRejectedValue(new Error("当前指挥已结束")),
        } as any);
        const failedTool = new GetPatrollingToursTool({
            getTours: jest.fn().mockRejectedValue(new Error("database unavailable")),
        } as any);

        const noCommand = await noCommandTool.execute({});
        const failed = await failedTool.execute({});

        expect(noCommand.success).toBe(true);
        expect(parseData(noCommand).message).toBeTruthy();
        expect(failed.success).toBe(false);
        expect(parseData(failed).error).toContain("database unavailable");
    });

    it("has readable display names for all eight registered tools", () => {
        const service = new AgentService({} as any, {} as any, {} as any, {} as any);
        const displayName = (name: string) => (service as any).getToolDisplayName(name);

        expect(
            [
                "get_current_status",
                "get_operations",
                "search_documents",
                "get_typhoon_history",
                "get_duty_info",
                "get_messages",
                "get_severe_weather_history",
                "get_patrolling_tours",
            ].map(displayName),
        ).toEqual(["当前状态", "运营事件", "知识库文档", "历史台风", "值班信息", "指挥消息", "预警历史", "巡道记录"]);
    });
});
