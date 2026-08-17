import { ApiProperty } from "@nestjs/swagger";
import { IsIn, IsOptional, IsString, MaxLength } from "class-validator";
import { ChatSessionFrom, ChatSessionType } from "src/database/entity/chat-session.schema";

export class CreateChatSessionDto {
    @ApiProperty({ description: "会话类型：chat（普通对话）或 agent（指挥 Agent）", required: false, enum: ["chat", "agent"] })
    @IsOptional()
    @IsIn(["chat", "agent"])
    type?: ChatSessionType;

    @ApiProperty({ description: "会话来源：cocc / library / manager", required: false, enum: ["cocc", "library", "manager"] })
    @IsOptional()
    @IsIn(["cocc", "library", "manager"])
    from?: ChatSessionFrom;

    @ApiProperty({ description: "会话标题（可选，缺省时取首轮问题前 30 字）", required: false })
    @IsOptional()
    @IsString()
    @MaxLength(60)
    title?: string;
}

export class ListChatSessionQueryDto {
    @ApiProperty({ description: "按会话类型过滤（可选）", required: false, enum: ["chat", "agent"] })
    @IsOptional()
    @IsIn(["chat", "agent"])
    type?: ChatSessionType;
}
