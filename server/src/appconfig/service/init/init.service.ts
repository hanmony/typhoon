import { Injectable, Logger, OnModuleInit } from "@nestjs/common";
import { initSettings } from "./initors/init.settings";
import { ReadyState } from "src/common/lib/ready.state";
import { RepoService } from "src/database/service/repo/repo.service";

@Injectable()
export class InitService implements OnModuleInit {
    constructor(private readonly repo: RepoService) {}

    public state = new ReadyState();

    async onModuleInit() {
        logger.log(`AppConfig init-service starting...`);
        await initSettings(this.repo.settings);
        logger.log(`AppConfig init-service finished`);
        this.state.ready = true;
    }
}

const logger = new Logger(InitService.name);
