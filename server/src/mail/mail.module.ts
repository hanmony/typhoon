import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { CommonModule } from "src/common/common.module";
import { DatabaseModule } from "src/database/database.module";
import { HttpModule } from "@nestjs/axios";
import { MailController } from "./controller/mail.controller";
import { MailService } from "./service/mail.service";

@Module({
    imports: [CommonModule, DatabaseModule, ConfigModule, HttpModule],
    exports: [],
    providers: [MailService],
    controllers: [MailController],
})
export class MailModule {}
