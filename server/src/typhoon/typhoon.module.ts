import { TyphoonDutyController } from "./controller/typhoon.duty.controller";
import { TyphoonDutyService } from "./service/typhoon.duty.service";
import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { CommonModule } from "src/common/common.module";
import { DatabaseModule } from "src/database/database.module";
import { TyphoonController } from "./controller/typhoon.controller";
import { TyphoonService } from "./service/typhoon.service";
import { HttpModule } from "@nestjs/axios";
import { TyphoonCommandController } from "./controller/typhoon.command.controller";
import { TyphoonCommandService } from "./service/typhoon.command.service";
import { TyphoonExtremeEventService } from "./service/typhoon.extreme.event.service";
import { TyphoonExtremeEventController } from "./controller/typhoon.extreme.envent.controller";
import { TyphoonExtremeOperationService } from "./service/typhoon.extreme.operation.service";
import { TyphoonExtremeOperationController } from "./controller/typhoon.extreme.operation.controller";
import { TyphoonPatrollingController } from "./controller/typhoon.extreme.patrolling.controller";
import { TyphoonPatrollingService } from "./service/typhoon.extreme.patrolling.service";
import { TyphoonExtremeMessageController } from "./controller/typhoon.extreme.message.controller";
import { TyphoonExtremeMessageService } from "./service/typhoon.extreme.message.service";
import { LogModule } from "src/log/log.module";
import { WebSocketModule } from "src/websocket/websocket.module";
import { TyphoonCommandDetailService } from "./service/typhoon.command.detail.service";

@Module({
    imports: [CommonModule, DatabaseModule, ConfigModule, HttpModule, LogModule, WebSocketModule],
    exports: [TyphoonService, TyphoonCommandService, TyphoonExtremeEventService, TyphoonExtremeOperationService, TyphoonDutyService],
    providers: [
        TyphoonService,
        TyphoonCommandService,
        TyphoonCommandDetailService,
        TyphoonExtremeEventService,
        TyphoonExtremeOperationService,
        TyphoonExtremeMessageService,
        TyphoonDutyService,
        TyphoonPatrollingService,
    ],
    controllers: [
        TyphoonController,
        TyphoonCommandController,
        TyphoonExtremeEventController,
        TyphoonExtremeOperationController,
        TyphoonExtremeMessageController,
        TyphoonPatrollingController,
        TyphoonDutyController,
    ],
})
export class TyphoonModule {}
