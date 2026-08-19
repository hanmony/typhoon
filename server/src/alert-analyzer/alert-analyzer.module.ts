import { Module } from "@nestjs/common";
import { ThrottlerModule } from "@nestjs/throttler";
import { DatabaseModule } from "src/database/database.module";
import { AlertAnalyzerController } from "./controller/alert-analyzer.controller";
import { AnalyzerService } from "./service/analyzer.service";
import { CaseMatcherService } from "./service/case-matcher.service";

/**
 * AI 研判模块（M3 步骤 12 骨架）
 *  - CaseMatcherService：相似历史案例匹配（步骤 11，已交付）
 *  - AnalyzerService：研判编排（步骤 13 实现流水线；当前为骨架验证版）
 *  - 步骤 13 按需补 imports：LlmModule / KnowledgeBaseModule / AlertModule / TyphoonModule（ChatModule 同款写法）
 */
@Module({
    imports: [DatabaseModule, ThrottlerModule.forRoot([{ name: "chat", ttl: 60000, limit: 15 }])],
    controllers: [AlertAnalyzerController],
    providers: [AnalyzerService, CaseMatcherService],
    exports: [AnalyzerService],
})
export class AlertAnalyzerModule {}
