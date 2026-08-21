import { ChatSessionService, SESSION_MAX_MESSAGES } from "./chat-session.service";

describe("ChatSessionService", () => {
    const user = "alice";
    let chatSessions: Record<string, jest.Mock>;
    let service: ChatSessionService;

    beforeEach(() => {
        chatSessions = {
            create: jest.fn(),
            find: jest.fn(),
            findById: jest.fn(),
            updateOne: jest.fn(),
        };
        service = new ChatSessionService({ chatSessions } as any);
    });

    it("creates a session with safe defaults for the current user", async () => {
        const created = { _id: "507f1f77bcf86cd799439011", user, type: "chat", from: "cocc", messages: [] };
        chatSessions.create.mockResolvedValue(created);

        await expect(service.create(user, {})).resolves.toBe(created);
        expect(chatSessions.create).toHaveBeenCalledWith({
            user,
            type: "chat",
            from: "cocc",
            title: "",
            messages: [],
        });
    });

    it("copies validated legacy messages into a new session", async () => {
        const messages = [
            { role: "user" as const, content: "旧问题" },
            { role: "assistant" as const, content: "旧回答" },
        ];
        chatSessions.create.mockResolvedValue({ messages });

        await service.create(user, { type: "agent", from: "cocc", messages });

        expect(chatSessions.create).toHaveBeenCalledWith({
            user,
            type: "agent",
            from: "cocc",
            title: "",
            messages,
        });
    });

    it("filters a session list by type and source", async () => {
        const lean = jest.fn().mockResolvedValue([]);
        const limit = jest.fn().mockReturnValue({ lean });
        const sort = jest.fn().mockReturnValue({ limit });
        chatSessions.find.mockReturnValue({ sort });

        await service.list(user, "chat", "cocc");

        expect(chatSessions.find).toHaveBeenCalledWith({ user, type: "chat", from: "cocc" });
    });

    it("rejects invalid, missing, and foreign sessions", async () => {
        await expect(service.findOwned(user, "not-an-object-id")).rejects.toThrow("会话不存在");
        expect(chatSessions.findById).not.toHaveBeenCalled();

        chatSessions.findById.mockResolvedValueOnce(null);
        await expect(service.findOwned(user, "507f1f77bcf86cd799439011")).rejects.toThrow("会话不存在");

        chatSessions.findById.mockResolvedValueOnce({ user: "bob" });
        await expect(service.findOwned(user, "507f1f77bcf86cd799439012")).rejects.toThrow("无权访问该会话");
    });

    it("loads only the most recent 20 messages", async () => {
        const messages = Array.from({ length: 24 }, (_, index) => ({
            role: index % 2 === 0 ? ("user" as const) : ("assistant" as const),
            content: `message-${index}`,
        }));
        chatSessions.findById.mockResolvedValue({ user, messages });

        const history = await service.loadHistory(user, "507f1f77bcf86cd799439011");

        expect(history).toHaveLength(SESSION_MAX_MESSAGES);
        expect(history[0].content).toBe("message-4");
        expect(history.at(-1)?.content).toBe("message-23");
    });

    it("atomically appends an exchange and keeps only the latest 20 messages", async () => {
        chatSessions.updateOne.mockResolvedValue({ matchedCount: 1 });

        await service.appendExchange(user, "507f1f77bcf86cd799439011", "  本轮问题  ", "本轮回答");

        expect(chatSessions.updateOne).toHaveBeenNthCalledWith(
            1,
            { _id: "507f1f77bcf86cd799439011", user, title: "" },
            { $set: { title: "本轮问题" } },
        );
        expect(chatSessions.updateOne).toHaveBeenNthCalledWith(
            2,
            { _id: "507f1f77bcf86cd799439011", user },
            {
                $push: {
                    messages: {
                        $each: [
                            { role: "user", content: "  本轮问题  " },
                            { role: "assistant", content: "本轮回答" },
                        ],
                        $slice: -SESSION_MAX_MESSAGES,
                    },
                },
            },
        );
    });
});
