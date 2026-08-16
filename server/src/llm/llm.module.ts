import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { HttpModule } from "@nestjs/axios";
import { LlmService } from "./service/llm.service";
import { SseParser } from "./service/sse-parser";
import { LlmModelService } from "./service/llm-model.service";
import { LlmModelController } from "./controller/llm-model.controller";
import { DatabaseModule } from "src/database/database.module";

@Module({
    imports: [ConfigModule, HttpModule, DatabaseModule],
    providers: [SseParser, LlmModelService, LlmService],
    controllers: [LlmModelController],
    exports: [LlmService, SseParser, LlmModelService],
})
export class LlmModule {}
