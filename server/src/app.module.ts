import { Module, ValidationPipe } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { APP_GUARD, APP_PIPE } from "@nestjs/core";
import { ScheduleModule } from "@nestjs/schedule";
import { AppController } from "./app.controller";
import { AppService } from "./app.service";
import { CasemanModule } from "./caseman/caseman.module";
import { CommonModule } from "./common/common.module";
import { DatabaseModule } from "./database/database.module";
import { DiagnosticsModule } from "./diagnostics/diagnostics.module";
import { JwtAuthGuard } from "./security/lib/passport/jwt.authguard";
import { RolesGuard } from "./security/lib/passport/roles.guard";
import { SecurityModule } from "./security/security.module";
import { UsermanModule } from "./userman/userman.module";
import { TyphoonModule } from "./typhoon/typhoon.module";
import { AlertModule } from "./typhoon/alert/alert.module";
import { AppConfigModule } from "./appconfig/appconfig.module";
import { AccessoryModule } from "./accessory/accessory.module";
import { KnowledgeBaseModule } from "./knowledge-base/knowledge-base.module";
import { ChatModule } from "./chat/chat.module";
import { AgentModule } from "./agent/agent.module";

@Module({
    imports: [
        ConfigModule.forRoot({
            envFilePath: [".env.local", ".env"],
        }),
        ScheduleModule.forRoot(),
        CommonModule,
        DatabaseModule,
        CasemanModule,
        DiagnosticsModule,
        SecurityModule,
        UsermanModule,
        TyphoonModule,
        AlertModule,
        AppConfigModule,
        AccessoryModule,
        KnowledgeBaseModule,
        ChatModule,
        AgentModule,
    ],
    controllers: [AppController],
    providers: [
        AppService,
        { provide: APP_PIPE, useClass: ValidationPipe },
        { provide: APP_GUARD, useClass: JwtAuthGuard },
        { provide: APP_GUARD, useClass: RolesGuard },
    ],
})
export class AppModule {}
