import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { Document } from "mongoose";

/** 会话类型：chat=普通 AI 对话，agent=指挥 Agent（带工具调用） */
export type ChatSessionType = "chat" | "agent";

/** 会话来源：cocc=指挥大屏悬浮面板，library=案例库机器人，manager=管理后台 */
export type ChatSessionFrom = "cocc" | "library" | "manager";

/** 会话消息（嵌入 ChatSessionEntity.messages 数组，不单独建集合） */
@Schema({ _id: false })
export class ChatSessionMessageEntity {
    @Prop({ required: true, enum: ["user", "assistant"] })
    role: "user" | "assistant";

    @Prop({ required: true, maxlength: 2000 })
    content: string;
}

export const ChatSessionMessageSchema = SchemaFactory.createForClass(ChatSessionMessageEntity);

@Schema({ timestamps: true })
export class ChatSessionEntity {
    /** 会话归属用户（登录用户名，JWT payload.id），用于按用户隔离 */
    @Prop({ required: true, index: true })
    user: string;

    /** 会话类型：chat | agent */
    @Prop({ required: true, enum: ["chat", "agent"], default: "chat", index: true })
    type: ChatSessionType;

    /** 会话来源：cocc | library | manager */
    @Prop({ required: true, enum: ["cocc", "library", "manager"], default: "cocc" })
    from: ChatSessionFrom;

    /** 会话标题（创建时可传；首轮问答后若为空自动取问题前 30 字） */
    @Prop({ default: "" })
    title: string;

    /** 消息列表（role/content），服务端自动只保留最近 20 条 */
    @Prop({ type: [ChatSessionMessageSchema], default: [] })
    messages: ChatSessionMessageEntity[];

    /** 创建时间（timestamps 自动维护） */
    createdAt: Date;

    /** 更新时间（timestamps 自动维护） */
    updatedAt: Date;
}

export const ChatSessionSchema = SchemaFactory.createForClass(ChatSessionEntity);
export type ChatSessionDocument = ChatSessionEntity & Document;
