import { Injectable } from "@nestjs/common";
import { OnEvent } from "@nestjs/event-emitter";
import { merge } from "lodash";
import { events } from "src/common/lib/event.types";
import { OpLogDto } from "../domain/dto/oplog.dto";
import { RepoService } from "src/database/service/repo/repo.service";
import { UserDataDto } from "src/userman/domain/user.data.dto";

@Injectable()
export class OplogService {
    constructor(private readonly repo: RepoService) {}

    @OnEvent(events.opLog)
    async onOpLog(args: OpLogDto) {
        const logger = new this.repo.userLogs();
        logger.ip = args.req.ip;
        logger.useragent = args.agent;
        logger.user = String(args.req.user["id"]);
        const user = args.req.user as UserDataDto;
        logger.name = user.name ?? "";
        logger.dept = user.department ?? "";
        logger.job = user.roles.join(",");
        logger.module = args.module;
        logger.title = args.title;
        logger.url = args.url;
        logger.request = JSON.stringify(merge({}, args.req.query, args.req.params, args.req.body));
        logger.response = "";
        logger.createtime = new Date();
        await logger.save();
    }
}
