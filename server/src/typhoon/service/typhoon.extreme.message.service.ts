import { Injectable } from "@nestjs/common";
import { RepoService } from "src/database/service/repo/repo.service";
import { Failed } from "src/diagnostics/lib/failed";
import { UserDataDto } from "src/userman/domain/user.data.dto";
import { TyphoonExtremeMessageCreateDto } from "../domain/typhoon.extreme.message.create.dto";
import { TyphoonExtremeMessageDto } from "../domain/typhoon.extreme.message.dto";
import { TyphoonExtremeMessagePadDto } from "../domain/typhoon.extreme.message.pad.dto";
import { TyphoonExtremeMessageUpdateDto } from "../domain/typhoon.extreme.message.update.dto";

@Injectable()
export class TyphoonExtremeMessageService {
    constructor(private readonly repo: RepoService) {}

    async getAll(): Promise<TyphoonExtremeMessageDto[]> {
        let list = [];
        const command = await this.repo.typhoonCommands.findOne({ status: 0 }, {}, { sort: { createTime: -1 } }).exec();
        if (command) {
            list = await this.repo.typhoonExtremeMessages
                .find({ commandId: command._id.toString() }, {}, { sort: { createTime: -1 } })
                .exec();
        }
        return list.map(u => TyphoonExtremeMessageDto.fromDoc(u));
    }

    async getPadAll(user: UserDataDto): Promise<TyphoonExtremeMessagePadDto[]> {
        let list = [];
        const command = await this.repo.typhoonCommands.findOne({ status: 0 }, {}, { sort: { createTime: -1 } }).exec();
        if (command) {
            list = await this.repo.typhoonExtremeMessages
                .find({ commandId: command._id.toString() }, {}, { sort: { createTime: -1 } })
                .exec();
        }
        return list.map(u => TyphoonExtremeMessagePadDto.fromDoc(u, user));
    }

    async read(user: UserDataDto, id: string) {
        const message = await this.repo.typhoonExtremeMessages.findOne({ _id: id }).exec();
        if (message) {
            if (!message.readUserIds.includes(user.id)) {
                message.readUserIds.push(user.id);
                await message.save();
            }
        }
    }

    async add(data: TyphoonExtremeMessageCreateDto) {
        const command = await this.repo.typhoonCommands.findOne({ status: 0 }, {}, { sort: { createTime: -1 } }).exec();
        if (command) {
            const entity = new this.repo.typhoonExtremeMessages();
            entity.commandId = command._id.toString();
            entity.type = data.type;
            entity.title = data.title;
            entity.content = data.content;
            entity.lines = data.lines;
            entity.eventIds = data.eventIds;
            entity.readUserIds = [];
            entity.createTime = new Date();
            entity.updateTime = new Date();
            await entity.save();
        } else {
            Failed.throw(`请先创建指挥`);
        }
    }

    async update(data: TyphoonExtremeMessageUpdateDto) {
        const entity = await this.repo.typhoonExtremeMessages.findOne({ _id: data.id }).exec();
        if (!entity) {
            Failed.throw(`消息不存在`);
        }
        entity.type = data.type;
        entity.title = data.title;
        entity.content = data.content;
        entity.lines = data.lines;
        entity.readUserIds = [];
        entity.eventIds = data.eventIds;
        entity.updateTime = new Date();
        await entity.save();
    }

    async remove(id: string) {
        await this.repo.typhoonExtremeMessages.deleteOne({ _id: id }).exec();
    }
}

// const logger = new Logger("TyphoonExtremeMessageService");
