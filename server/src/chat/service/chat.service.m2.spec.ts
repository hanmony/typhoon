import { lastValueFrom, of, toArray } from "rxjs";
import { ChatService } from "./chat.service";

describe("ChatService M2 session persistence", () => {
    const serverHistory = [
        { role: "user" as const, content: "服务端上一问" },
        { role: "assistant" as const, content: "服务端上一答" },
    ];
    const clientHistory = [{ role: "user" as const, content: "不应使用的前端历史" }];

    let intentClassifier: any;
    let llmService: any;
    let sessionService: any;
    let service: ChatService;

    beforeEach(() => {
        intentClassifier = {
            classify: jest.fn().mockResolvedValue({ sources: [], chatResult: undefined }),
            filterSources: jest.fn().mockReturnValue([]),
        };
        llmService = {
            chatStream: jest.fn().mockReturnValue(of({ type: "token", data: "答" }, { type: "token", data: "案" })),
        };
        sessionService = {
            loadHistory: jest.fn().mockResolvedValue(serverHistory),
            appendExchange: jest.fn().mockResolvedValue(undefined),
        };
        const diagnostics = {
            logIntent: jest.fn(),
            logFreeformPrompt: jest.fn(),
            logMetrics: jest.fn(),
            logError: jest.fn(),
        };
        service = new ChatService(
            intentClassifier,
            {} as any,
            llmService,
            diagnostics as any,
            { getCapabilityDescription: jest.fn().mockReturnValue("") } as any,
            sessionService,
        );
    });

    it("uses server history for classification and generation, then persists the answer", async () => {
        const events = await lastValueFrom(
            service
                .chatStream("本轮追问", clientHistory, "cocc", undefined, "507f1f77bcf86cd799439011", "alice")
                .pipe(toArray()),
        );

        expect(sessionService.loadHistory).toHaveBeenCalledWith("alice", "507f1f77bcf86cd799439011");
        expect(intentClassifier.classify).toHaveBeenCalledWith("本轮追问", serverHistory);
        const messages = llmService.chatStream.mock.calls[0][0];
        expect(messages).toEqual(
            expect.arrayContaining([
                expect.objectContaining({ role: "user", content: "服务端上一问" }),
                expect.objectContaining({ role: "assistant", content: "服务端上一答" }),
            ]),
        );
        expect(messages).not.toEqual(
            expect.arrayContaining([expect.objectContaining({ content: "不应使用的前端历史" })]),
        );
        expect(sessionService.appendExchange).toHaveBeenCalledWith(
            "alice",
            "507f1f77bcf86cd799439011",
            "本轮追问",
            "答案",
        );
        expect(
            events
                .filter(event => event.type === "token")
                .map(event => event.data)
                .join(""),
        ).toBe("答案");
    });

    it("keeps the original stateless behavior when sessionId is absent", async () => {
        await lastValueFrom(service.chatStream("本轮追问", clientHistory, "cocc").pipe(toArray()));

        expect(sessionService.loadHistory).not.toHaveBeenCalled();
        expect(intentClassifier.classify).toHaveBeenCalledWith("本轮追问", clientHistory);
        expect(sessionService.appendExchange).not.toHaveBeenCalled();
    });
});
