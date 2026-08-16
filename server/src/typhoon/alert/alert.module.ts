import { Module } from "@nestjs/common";
import { CommonModule } from "src/common/common.module";
import { DatabaseModule } from "src/database/database.module";
import { AlertController } from "./alert.controller";
import { AlertService } from "./alert.service";
import { WindCircleService } from "./wind-circle.service";
import { TyphoonModule } from "../typhoon.module";

@Module({
    imports: [CommonModule, DatabaseModule, TyphoonModule],
    controllers: [AlertController],
    providers: [AlertService, WindCircleService],
    exports: [AlertService],
})
export class AlertModule {}
