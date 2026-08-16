import { Module } from "@nestjs/common";
import { CommonModule } from "../common/common.module";
import { DatabaseModule } from "../database/database.module";
import { LogService } from "./service/log.service";
import { LogController } from "./controller/log.controller";
import { OplogService } from "./service/oplog.service";

@Module({
    imports: [CommonModule, DatabaseModule],
    providers: [LogService, OplogService],
    controllers: [LogController],
})
export class LogModule {}
