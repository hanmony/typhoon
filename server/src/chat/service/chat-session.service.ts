import { Injectable } from "@nestjs/common";
import { Failed } from "src/diagnostics/lib/failed";
import { ChatSessionEntity, ChatSessionFrom, ChatSessionType } from "src/database/entity/chat-session.schema";
import { RepoService } from "src/database/service/repo/repo.service";
import { CreateChatSessionDto } from "../domain/dto/chat-session.dto";

const LIST_LIMIT = 50;

@Injectable()
export class ChatSessionService {
    constructor(private readonly repo: RepoService) {}

    /** 创建会话（归属当前登录用户），返回完整会话（含 _id） */
    async create(user: string, dto: CreateChatSessionDto): Promise<ChatSessionEntity> {
        const session = await this.repo.chatSessions.create({
            user,
            type: dto.type ?? "chat",
            from: dto.from ?? "cocc",
            title: dto.title ?? "",
            messages: [],
        });
        return session;
    }

    /** 当前用户的会话列表（摘要，不含 messages 内容），按最近更新倒序，上限 50 条 */
    async list(user: string, type?: ChatSessionType) {
        const filter: Record<string, unknown> = { user };
        if (type) filter.type = type;
        const sessions = await this.repo.chatSessions
            .find(filter)
            .sort({ updatedAt: -1 })
            .limit(LIST_LIMIT)
            .lean();
        return sessions.map(s => ({
            id: s._id,
            type: s.type,
            from: s.from,
            title: s.title || "新会话",
            messageCount: (s.messages || []).length,
            createdAt: s.createdAt,
            updatedAt: s.updatedAt,
        }));
    }

    /** 会话详情（含完整消息列表）；会话不存在或不属于当前用户时抛错 */
    async get(user: string, id: string): Promise<ChatSessionEntity> {
        return this.findOwned(user, id);
    }

    /** 删除会话；会话不存在或不属于当前用户时抛错 */
    async remove(user: string, id: string): Promise<void> {
        const session = await this.findOwned(user, id);
        await session.deleteOne();
    }

    /** 按 id 查找且校验归属当前用户（M2 步骤 9 的 stream 持久化也复用此方法） */
    async findOwned(user: string, id: string): Promise<ChatSessionEntity & { deleteOne(): Promise<unknown> }> {
        const session = await this.repo.chatSessions.findById(id);
        Failed.check(session, "会话不存在");
        Failed.check(session.user === user, "无权访问该会话");
        return session as ChatSessionEntity & { deleteOne(): Promise<unknown> };
    }
}
