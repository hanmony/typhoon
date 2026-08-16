import { Module } from "@nestjs/common";
import { ThrottlerModule } from "@nestjs/throttler";
import { LlmModule } from "src/llm/llm.module";
import { KnowledgeBaseModule } from "src/knowledge-base/knowledge-base.module";
import { AlertModule } from "src/typhoon/alert/alert.module";
import { TyphoonModule } from "src/typhoon/typhoon.module";
import { ChatController } from "./controller/chat.controller";
import { ChatService } from "./service/chat.service";
import { ChatDiagnosticsService } from "./service/chat.diagnostics.service";
import { IntentClassifier } from "./service/intent-classifier";
import { DataAggregator } from "./service/data-aggregator";

@Module({
    imports: [
        LlmModule,
        KnowledgeBaseModule,
        AlertModule,
        TyphoonModule,
        ThrottlerModule.forRoot([{ name: "chat", ttl: 60000, limit: 15 }]),
    ],
    controllers: [ChatController],
    providers: [IntentClassifier, DataAggregator, ChatService, ChatDiagnosticsService],
})
export class ChatModule {}
