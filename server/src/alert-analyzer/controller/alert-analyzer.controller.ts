import { Body, Controller, Post, Res, UseGuards } from "@nestjs/common";
import { Throttle, ThrottlerGuard } from "@nestjs/throttler";
import { ApiBearerAuth, ApiOperation, ApiTags } from "@nestjs/swagger";
import { Response } from "express";
import { Subscription } from "rxjs";
import { ActionLog } from "src/diagnostics/lib/action.logger.interceptor";
import { AlertAnalyzerDto } from "../domain/alert-analyzer.dto";
import { AnalyzerService } from "../service/analyzer.service";

@ApiBearerAuth()
@ApiTags("AI 研判")
@Controller("alert-analyzer")
@UseGuards(ThrottlerGuard)
export class AlertAnalyzerController {
    constructor(private readonly analyzerService: AnalyzerService) {}

    @ApiOperation({ summary: "台风影响研判（SSE 流式）" })
    @Post("stream")
    @Throttle({ chat: { limit: 15, ttl: 60000 } })
    @ActionLog("AI研判", "研判流")
    async stream(@Body() dto: AlertAnalyzerDto, @Res() res: Response) {
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

        const stream$ = this.analyzerService.streamAnalysis(dto);

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
