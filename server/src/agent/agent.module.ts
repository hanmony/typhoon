import { Module, Logger } from "@nestjs/common";
import { HttpModule } from "@nestjs/axios";
import { ConfigModule } from "@nestjs/config";
import { ThrottlerModule } from "@nestjs/throttler";
import { LlmModule } from "src/llm";
import { KnowledgeBaseModule } from "src/knowledge-base";
import { AlertModule } from "src/typhoon/alert/alert.module";
import { TyphoonModule } from "src/typhoon/typhoon.module";
import { ChatModule } from "src/chat/chat.module";
import { AgentController } from "./agent.controller";
import { AgentService } from "./agent.service";
import { AgentDiagnosticsService } from "./agent.diagnostics.service";
import { ToolRegistry } from "./tools/tool.registry";
import { GetCurrentStatusTool } from "./tools/get-current-status.tool";
import { GetOperationsTool } from "./tools/get-operations.tool";
import { SearchDocumentsTool } from "./tools/search-documents.tool";
import { GetTyphoonHistoryTool } from "./tools/get-typhoon-history.tool";
import { GetDutyInfoTool } from "./tools/get-duty-info.tool";
import { GetMessagesTool } from "./tools/get-messages.tool";
import { GetSevereWeatherHistoryTool } from "./tools/get-severe-weather-history.tool";
import { GetPatrollingToursTool } from "./tools/get-patrolling-tours.tool";

const logger = new Logger("AgentModule");

/** 工具注册工厂：在 ToolRegistry 上注册所有工具 */
const TOOL_REGISTRATION_PROVIDER = {
    provide: "TOOL_REGISTRATION",
    useFactory: (
        registry: ToolRegistry,
        getStatusTool: GetCurrentStatusTool,
        operationsTool: GetOperationsTool,
        searchDocsTool: SearchDocumentsTool,
        historyTool: GetTyphoonHistoryTool,
        dutyTool: GetDutyInfoTool,
        messagesTool: GetMessagesTool,
        severeWeatherHistoryTool: GetSevereWeatherHistoryTool,
        patrollingToursTool: GetPatrollingToursTool,
    ) => {
        registry.register(GetCurrentStatusTool.definition, getStatusTool);
        registry.register(GetOperationsTool.definition, operationsTool);
        registry.register(searchDocsTool.buildDefinition(), searchDocsTool);
        registry.register(GetTyphoonHistoryTool.definition, historyTool);
        registry.register(GetDutyInfoTool.definition, dutyTool);
        registry.register(GetMessagesTool.definition, messagesTool);
        registry.register(GetSevereWeatherHistoryTool.definition, severeWeatherHistoryTool);
        registry.register(GetPatrollingToursTool.definition, patrollingToursTool);
        logger.log("All 8 agent tools registered");
        return registry;
    },
    inject: [
        ToolRegistry,
        GetCurrentStatusTool,
        GetOperationsTool,
        SearchDocumentsTool,
        GetTyphoonHistoryTool,
        GetDutyInfoTool,
        GetMessagesTool,
        GetSevereWeatherHistoryTool,
        GetPatrollingToursTool,
    ],
};

@Module({
    imports: [
        LlmModule,
        KnowledgeBaseModule,
        AlertModule,
        TyphoonModule,
        ChatModule,
        HttpModule,
        ConfigModule,
        ThrottlerModule.forRoot([{ name: "chat", ttl: 60000, limit: 15 }]),
    ],
    controllers: [AgentController],
    providers: [
        AgentService,
        AgentDiagnosticsService,
        ToolRegistry,
        GetCurrentStatusTool,
        GetOperationsTool,
        SearchDocumentsTool,
        GetTyphoonHistoryTool,
        GetDutyInfoTool,
        GetMessagesTool,
        GetSevereWeatherHistoryTool,
        GetPatrollingToursTool,
        TOOL_REGISTRATION_PROVIDER,
    ],
})
export class AgentModule {}
