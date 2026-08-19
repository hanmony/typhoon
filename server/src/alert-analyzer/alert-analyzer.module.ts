import { Module } from "@nestjs/common";
import { ThrottlerModule } from "@nestjs/throttler";
import { DatabaseModule } from "src/database/database.module";
import { LlmModule } from "src/llm/llm.module";
import { TyphoonModule } from "src/typhoon/typhoon.module";
import { AlertAnalyzerController } from "./controller/alert-analyzer.controller";
import { AnalyzerService } from "./service/analyzer.service";
import { CaseMatcherService } from "./service/case-matcher.service";

/**
 * AI 研判模块（M3 步骤 12 骨架 + 步骤 13 编排）
 *  - CaseMatcherService：相似历史案例匹配（步骤 11，已交付）
 *  - AnalyzerService：研判编排（步骤 13：获取台风 → 案例匹配 → 防编造 prompt → LlmService 流式）
 *  - M4 若需线路空间研判，再按需补 AlertModule（wind-circle）等
 */
@Module({
    imports: [DatabaseModule, LlmModule, TyphoonModule, ThrottlerModule.forRoot([{ name: "chat", ttl: 60000, limit: 15 }])],
    controllers: [AlertAnalyzerController],
    providers: [AnalyzerService, CaseMatcherService],
    exports: [AnalyzerService],
})
export class AlertAnalyzerModule {}
