import { Body, Controller, Post, Res, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiTags } from "@nestjs/swagger";
import { ThrottlerGuard, Throttle } from "@nestjs/throttler";
import { Response } from "express";
import { ActionLog } from "src/diagnostics/lib/action.logger.interceptor";
import { User } from "src/security/lib/decorator/user.decorator";
import { UserDataDto } from "src/userman/domain/user.data.dto";
import { ChatService } from "../service/chat.service";
import { ChatQueryDto } from "../domain/dto/chat.dto";
import { Subscription } from "rxjs";

@ApiBearerAuth()
@ApiTags("AI 对话")
@Controller("chat")
@UseGuards(ThrottlerGuard)
export class ChatController {
    constructor(private readonly chatService: ChatService) {}

    @ApiOperation({ summary: "AI 对话（SSE 流式）" })
    @Post("stream")
    @Throttle({ chat: { limit: 15, ttl: 60000 } })
    @ActionLog("AI对话", "流式对话")
    async chatStream(@Body() dto: ChatQueryDto, @User() user: UserDataDto, @Res() res: Response) {
        res.setHeader("Content-Type", "text/event-stream");
        res.setHeader("Cache-Control", "no-cache");
        res.setHeader("Connection", "keep-alive");
        res.flushHeaders();

        // eslint-disable-next-line prefer-const -- subscription is referenced in close callback before assignment
        let subscription: Subscription | undefined;
        let closed = false;

        res.on("close", () => {
            closed = true;
            if (subscription) subscription.unsubscribe();
        });

        const stream$ = this.chatService.chatStream(
            dto.question,
            dto.history,
            dto.from,
            dto.modelId,
            dto.sessionId,
            user?.id,
        );

        subscription = stream$.subscribe({
            next: event => {
                if (!closed) {
                    res.write(`data: ${JSON.stringify(event)}\n\n`);
                }
            },
            error: err => {
                if (!closed) {
                    res.write(`event: error\ndata: ${JSON.stringify({ message: (err as Error).message })}\n\n`);
                    res.end();
                }
            },
            complete: () => {
                if (!closed) {
                    res.write("data: [DONE]\n\n");
                    res.end();
                }
            },
        });
    }
}
