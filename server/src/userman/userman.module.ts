import { Module } from "@nestjs/common";
import { DatabaseModule } from "src/database/database.module";
import { SecurityModule } from "src/security/security.module";
import { UserController } from "./controller/user/user.controller";
import { UserService } from "./service/user/user.service";
import { CommonModule } from "src/common/common.module";
import { LogModule } from "src/log/log.module";

@Module({
    controllers: [UserController],
    providers: [UserService],
    imports: [DatabaseModule, SecurityModule, CommonModule, LogModule],
})
export class UsermanModule {}
