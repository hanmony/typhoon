import { Body, Controller, Delete, Get, Param, Post, Query } from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiTags } from "@nestjs/swagger";
import { ActionLog } from "src/diagnostics/lib/action.logger.interceptor";
import { User } from "src/security/lib/decorator/user.decorator";
import { UserDataDto } from "src/userman/domain/user.data.dto";
import { ChatSessionService } from "../service/chat-session.service";
import { CreateChatSessionDto, ListChatSessionQueryDto } from "../domain/dto/chat-session.dto";

@ApiBearerAuth()
@ApiTags("AI 会话")
@Controller("chat")
export class ChatSessionController {
    constructor(private readonly sessionService: ChatSessionService) {}

    @ApiOperation({ summary: "创建 AI 会话" })
    @Post("sessions")
    @ActionLog("AI会话", "创建会话")
    async create(@User() user: UserDataDto, @Body() dto: CreateChatSessionDto) {
        return this.sessionService.create(user.id, dto);
    }

    @ApiOperation({ summary: "当前用户的会话列表" })
    @Get("sessions")
    async list(@User() user: UserDataDto, @Query() query: ListChatSessionQueryDto) {
        return this.sessionService.list(user.id, query.type);
    }

    @ApiOperation({ summary: "会话详情（含消息列表）" })
    @Get("sessions/:id")
    async get(@User() user: UserDataDto, @Param("id") id: string) {
        return this.sessionService.get(user.id, id);
    }

    @ApiOperation({ summary: "删除会话" })
    @Delete("sessions/:id")
    @ActionLog("AI会话", "删除会话")
    async delete(@User() user: UserDataDto, @Param("id") id: string) {
        await this.sessionService.remove(user.id, id);
        return { code: 0 };
    }
}
