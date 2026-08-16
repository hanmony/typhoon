import { Module } from "@nestjs/common";
import { EventEmitterModule } from "@nestjs/event-emitter";
import { DatabaseModule } from "../database/database.module";
import { SettingsController } from "./controller/settings.controller";
import { AppConfigService } from "./service/appconfig/appconfig.service";
import { InitService } from "./service/init/init.service";
import { SettingsService } from "./service/settings/settings.service";
import { LogModule } from "src/log/log.module";

@Module({
    imports: [
        DatabaseModule,
        EventEmitterModule.forRoot({
            maxListeners: 20,
        }),
        // ConfigModule.forRoot({ load: [ymlLoader] }),
        LogModule,
    ],
    providers: [AppConfigService, InitService, SettingsService],
    exports: [DatabaseModule, EventEmitterModule, AppConfigService, SettingsService, InitService],
    controllers: [SettingsController],
})
export class AppConfigModule {}
