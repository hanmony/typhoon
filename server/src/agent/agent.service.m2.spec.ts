import { lastValueFrom, of, toArray } from "rxjs";
import { AgentService } from "./agent.service";

describe("AgentService M2 session persistence", () => {
    it("loads server history and writes the completed answer back to the session", async () => {
        const llmService = {
            chatStreamWithTools: jest
                .fn()
                .mockReturnValue(of({ type: "token", data: "已" }, { type: "token", data: "完成" })),
        };
        const toolRegistry = {
            getToolDefinitions: jest.fn().mockReturnValue([]),
            execute: jest.fn(),
        };
        const diagnostics = {
            logRound: jest.fn(),
            logMetrics: jest.fn(),
            logError: jest.fn(),
        };
        const history = [
            { role: "user" as const, content: "服务端上一问" },
            { role: "assistant" as const, content: "服务端上一答" },
        ];
        const sessionService = {
            loadHistory: jest.fn().mockResolvedValue(history),
            appendExchange: jest.fn().mockResolvedValue(undefined),
        };
        const service = new AgentService(
            llmService as any,
            toolRegistry as any,
            diagnostics as any,
            sessionService as any,
        );

        const events = await lastValueFrom(
            service
                .chatStream(
                    "继续处理",
                    [{ role: "user", content: "不应使用的前端历史" }],
                    "cocc",
                    undefined,
                    "507f1f77bcf86cd799439011",
                    "alice",
                )
                .pipe(toArray()),
        );

        expect(sessionService.loadHistory).toHaveBeenCalledWith("alice", "507f1f77bcf86cd799439011");
        const messages = llmService.chatStreamWithTools.mock.calls[0][0];
        expect(messages).toEqual(
            expect.arrayContaining([
                expect.objectContaining({ content: "服务端上一问" }),
                expect.objectContaining({ content: "服务端上一答" }),
            ]),
        );
        expect(messages).not.toEqual(
            expect.arrayContaining([expect.objectContaining({ content: "不应使用的前端历史" })]),
        );
        expect(sessionService.appendExchange).toHaveBeenCalledWith(
            "alice",
            "507f1f77bcf86cd799439011",
            "继续处理",
            "已完成",
        );
        expect(
            events
                .filter(event => event.type === "token")
                .map(event => event.data)
                .join(""),
        ).toBe("已完成");
    });
});
