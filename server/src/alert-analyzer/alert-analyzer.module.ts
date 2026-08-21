import { Module } from "@nestjs/common";
import { ThrottlerModule } from "@nestjs/throttler";
import { DatabaseModule } from "src/database/database.module";
import { LlmModule } from "src/llm/llm.module";
import { TyphoonModule } from "src/typhoon/typhoon.module";
import { AlertModule } from "src/typhoon/alert/alert.module";
import { AlertAnalyzerController } from "./controller/alert-analyzer.controller";
import { AnalyzerService } from "./service/analyzer.service";
import { CaseMatcherService } from "./service/case-matcher.service";
import { LineImpactService } from "./service/line-impact.service";

/**
 * AI 研判模块（M3 步骤 12 骨架 + 步骤 13 编排 + M4 步骤 16 线路空间研判）
 *  - CaseMatcherService：相似历史案例匹配（步骤 11）
 *  - AnalyzerService：研判编排（步骤 13：获取台风 → 案例匹配 → 防编造 prompt → LlmService 流式）
 *  - LineImpactService：turf 风圈×线路相交（步骤 16；步骤 17 把 affectedLines 接入 analysis 事件）
 */
@Module({
    imports: [
        DatabaseModule,
        LlmModule,
        TyphoonModule,
        AlertModule,
        ThrottlerModule.forRoot([{ name: "chat", ttl: 60000, limit: 15 }]),
    ],
    controllers: [AlertAnalyzerController],
    providers: [AnalyzerService, CaseMatcherService, LineImpactService],
    exports: [AnalyzerService],
})
export class AlertAnalyzerModule {}
