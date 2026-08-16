import { HttpService } from "@nestjs/axios";
import { Injectable, Logger } from "@nestjs/common";
import { RepoService } from "src/database/service/repo/repo.service";
import { UserDataDto } from "src/userman/domain/user.data.dto";
import { MailTyphoonCreateDto } from "../domain/mail.typhoon.create.dto";
import { Failed } from "src/diagnostics/lib/failed";

@Injectable()
export class MailService {
    constructor(
        private readonly repo: RepoService,
        private readonly http: HttpService,
    ) {}

    async read(id: string) {
        await this.repo.mails.updateOne({ _id: id }, { $set: { isRead: 1, readTime: new Date() } });
    }

    async typhoonList(user: UserDataDto) {
        return await this.repo.mails.find({}, { projection: { _id: 0 } });
    }

    async typhoonSend(user: UserDataDto, data: MailTyphoonCreateDto) {
        const username = "shst@superuser";
        const receiver = await this.repo.staffs.findOne({ username: username });
        Failed.check(receiver, "找不到接收消息的领导ID:" + username);
        await this.repo.mails.create({
            sender: user.id,
            receiver: receiver.username,
            title: data.title,
            content: data.content,
            type: "typhoon",
            subType: data.subType,
            typhoonEvents: data.typhoonEvents,
            typhoonLines: data.typhoonLines,
        });
    }
}

const logger = new Logger("MailService");
