import { Module } from "@nestjs/common";
import { ConfigModule, ConfigService } from "@nestjs/config";
import { JwtModule } from "@nestjs/jwt";
import { CommonModule } from "src/common/common.module";
import { DatabaseModule } from "src/database/database.module";
import { AuthController } from "./controller/auth/auth.controller";
import { JwtAuthGuard } from "./lib/passport/jwt.authguard";
import { JwtStrategy } from "./lib/passport/jwt.strategy";
import { LocalAuthGuard } from "./lib/passport/local.authguard";
import { LocalStrategy } from "./lib/passport/local.strategy";
import { AuthService } from "./service/auth/auth.service";
import { X5Module } from "src/x5/x5.module";
import { X5Strategy } from "./lib/passport/x5.strategy";

@Module({
    imports: [
        CommonModule,
        DatabaseModule,
        ConfigModule,
        X5Module,
        JwtModule.registerAsync({
            imports: [ConfigModule],
            useFactory: async (config: ConfigService) => ({
                secret: config.get<string>("SECRET"),
                signOptions: { expiresIn: "24h" },
            }),
            inject: [ConfigService],
        }),
    ],
    exports: [AuthService],
    providers: [AuthService, LocalStrategy, X5Strategy, LocalAuthGuard, JwtAuthGuard, JwtStrategy],
    controllers: [AuthController],
})
export class SecurityModule {}
