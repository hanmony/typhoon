import { Body, Controller, Post, Res, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiTags } from "@nestjs/swagger";
import { ThrottlerGuard, Throttle } from "@nestjs/throttler";
import { Response } from "express";
import { Subscription } from "rxjs";
import { AgentService } from "./agent.service";
import { AgentQueryDto } from "./domain/agent.dto";

@ApiBearerAuth()
@ApiTags("AI Agent")
@Controller("agent")
@UseGuards(ThrottlerGuard)
export class AgentController {
    constructor(private readonly agentService: AgentService) {}

    @ApiOperation({ summary: "AI Agent 对话（SSE 流式，支持 tool call）" })
    @Post("stream")
    @Throttle({ chat: { limit: 15, ttl: 60000 } })
    async chatStream(@Body() dto: AgentQueryDto, @Res() res: Response) {
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

        const stream$ = this.agentService.chatStream(dto.question, dto.history, dto.from, dto.modelId);

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
