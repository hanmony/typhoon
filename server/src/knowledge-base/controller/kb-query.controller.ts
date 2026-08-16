import { Body, Controller, Post, Res } from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiTags } from "@nestjs/swagger";
import { Response } from "express";
import { ActionLog } from "src/diagnostics/lib/action.logger.interceptor";
import { RagService } from "../service/rag.service";
import { RagQueryDto } from "../domain/dto/rag-query.dto";
import { RagResponseDto } from "../domain/dto/rag-response.dto";
import { Subscription } from "rxjs";

@ApiBearerAuth()
@ApiTags("知识库问答")
@Controller("kb/query")
export class KbQueryController {
    constructor(private readonly ragService: RagService) {}

    @ApiOperation({ summary: "知识库问答（非流式）" })
    @Post()
    @ActionLog("知识库", "知识问答")
    async query(@Body() dto: RagQueryDto): Promise<RagResponseDto> {
        const result = await this.ragService.query(dto.question, dto.topK, dto.category, dto.history);
        return {
            answer: result.answer,
            sources: result.sources.map(s => ({
                content: s.content,
                documentName: s.documentName,
                chunkIndex: s.chunkIndex,
                score: s.score,
            })),
        };
    }

    @ApiOperation({ summary: "知识库问答（SSE流式）" })
    @Post("stream")
    @ActionLog("知识库", "知识问答-流式")
    async queryStream(@Body() dto: RagQueryDto, @Res() res: Response) {
        res.setHeader("Content-Type", "text/event-stream");
        res.setHeader("Cache-Control", "no-cache");
        res.setHeader("Connection", "keep-alive");
        res.flushHeaders();

        let subscription: Subscription | undefined = undefined;
        let closed = false;

        res.on("close", () => {
            closed = true;
            if (subscription) subscription.unsubscribe();
        });

        const stream$ = this.ragService.queryStream(dto.question, dto.topK, dto.category, dto.history);

        subscription = stream$.subscribe({
            next: event => {
                if (!closed) {
                    if (event.type === "sources") {
                        res.write(`data: ${JSON.stringify({ sources: event.data })}\n\n`);
                    } else if (event.type === "thinking") {
                        res.write(`data: ${JSON.stringify({ type: "thinking", data: event.data })}\n\n`);
                    } else {
                        res.write(`data: ${JSON.stringify({ content: event.data })}\n\n`);
                    }
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
