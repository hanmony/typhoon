import { INestApplication, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { NestFactory } from "@nestjs/core";
import { DocumentBuilder, SwaggerModule } from "@nestjs/swagger";
import { text as figlet } from "figlet";
import helmet from "helmet";
import { AppModule } from "./app.module";
import { sm3 } from "./common/lib/crypto.helper";
import { RepoService } from "./database/service/repo/repo.service";
import { WinstonLogger } from "./logger";
import { RoleType } from "./security/domain/role.type";
import { AuthService } from "./security/service/auth/auth.service";

figlet("Typhoon Server v1.0", (err, data) => {
    if (!err) {
        console.log(data);
    }
    bootstrap();
});

async function bootstrap() {
    process.on("uncaughtException", err => Logger.error(err));
    Logger.log("Starting Typhoon Server...");
    const app = await NestFactory.create(AppModule);
    // use winston logger
    app.useLogger(new WinstonLogger());
    // enable shutdown hooks
    app.enableShutdownHooks();
    // allow proxy pass real ip of client
    app.getHttpAdapter().getInstance().enable("trust proxy");
    // add helmet
    app.use(helmet());

    // create swagger doc
    const swagger = new DocumentBuilder()
        .setTitle("Typhoon Server API")
        .setDescription("Typhoon Server API")
        .setVersion("1.0")
        .addBearerAuth()
        .build();
    const document = SwaggerModule.createDocument(app, swagger);
    SwaggerModule.setup("doc", app, document);

    await afterAppStarted(app);

    const config = app.get(ConfigService);
    const host = config.get<string>("SERVER_HOST", "0.0.0.0");
    const port = config.get<number>("PORT", 0);
    Logger.log(`HOST: ${host}, PORT: ${port}`);
    await app.listen(port, host);
    Logger.log(`Typhoon Server is running on http://${host}:${port}`);
}

async function afterAppStarted(app: INestApplication) {
    // check admin account
    const repo = app.get(RepoService);
    const admin = await repo.staffs.findOne({ username: "admin" });

    if (!admin) {
        const auth = app.get(AuthService);
        Logger.log("No admin account found, create one...");
        const pwd = await auth.getPasswordHash(sm3("296admin296"));
        await repo.staffs.create({
            username: "admin",
            password: pwd,
            nickname: "超级管理员",
            roles: [RoleType.admin],
            status: 0,
        });
    } else {
        const auth = app.get(AuthService);
        admin.password = await auth.getPasswordHash(sm3("296admin296"));
        admin.save();
    }
}
