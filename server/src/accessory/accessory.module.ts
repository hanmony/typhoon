import { Module } from "@nestjs/common";
import { CommonModule } from "../common/common.module";
import { DatabaseModule } from "../database/database.module";
import { DiagnosticsModule } from "../diagnostics/diagnostics.module";
import { AccessoryController } from "./controller/accessory.controller";
import { FileNameEncodePipe } from "./filename.encode.pipe";
import { AccessoryService } from "./service/accessory.service";
import { LogModule } from "src/log/log.module";

@Module({
    imports: [CommonModule, DiagnosticsModule, DatabaseModule, LogModule],
    providers: [AccessoryService, FileNameEncodePipe],
    exports: [AccessoryService],
    controllers: [AccessoryController],
})
export class AccessoryModule {}
