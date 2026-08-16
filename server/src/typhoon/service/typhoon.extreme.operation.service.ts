import { Injectable, Logger } from "@nestjs/common";
import { RepoService } from "src/database/service/repo/repo.service";
import { Failed } from "src/diagnostics/lib/failed";
import { TyphoonExtremeOperationDto } from "../domain/typhoon.extreme.operation.dto";
import { TyphoonExtremeOperationCreateDto } from "../domain/typhoon.extreme.operation.create.dto";
import {
    BatchUpdateOperationParams,
    TyphoonExtremeOperationUpdateDto,
} from "../domain/typhoon.extreme.operation.update.dto";
import {
    TyphoonExtremeOpDetailCreateDto,
    TyphoonExtremeOpDetailDto,
    TyphoonExtremeOpDetailUpdateDto,
} from "../domain/typhoon.extreme.op.detail.dto";
@Injectable()
export class TyphoonExtremeOperationService {
    constructor(private readonly repo: RepoService) {}

    async getActive(): Promise<TyphoonExtremeOperationDto[]> {
        const command = await this.repo.typhoonCommands.findOne({ status: 0 }, {}, { sort: { createTime: -1 } }).exec();
        if (!command) return [];
        const now = new Date();
        const list = await this.repo.typhoonExtremeOperations
            .find(
                {
                    commandId: command._id.toString(),
                    isShow: 1,
                    startTime: { $lte: now },
                    $or: [{ actualEndTime: null }, { actualEndTime: { $gt: now } }],
                },
                {},
                { sort: { createTime: -1 } },
            )
            .exec();
        return list.map(u => TyphoonExtremeOperationDto.fromDoc(u));
    }

    async getAll(): Promise<TyphoonExtremeOperationDto[]> {
        let list = [];
        const command = await this.repo.typhoonCommands.findOne({ status: 0 }, {}, { sort: { createTime: -1 } }).exec();
        if (command) {
            list = await this.repo.typhoonExtremeOperations
                .find({ commandId: command._id.toString() }, {}, { sort: { createTime: -1 } })
                .exec();
        }
        return list.map(u => TyphoonExtremeOperationDto.fromDoc(u));
    }

    async add(data: TyphoonExtremeOperationCreateDto) {
        const command = await this.repo.typhoonCommands.findOne({ status: 0 }, {}, { sort: { createTime: -1 } }).exec();
        if (command) {
            const entity = new this.repo.typhoonExtremeOperations();
            entity.commandId = command._id.toString();
            entity.actionType = data.actionType;
            entity.close = data.close;
            entity.distance = data.distance;
            entity.customPosition = data.customPosition;
            entity.description = data.description;
            entity.direction = data.direction;
            entity.startStation = data.startStation;
            entity.endStation = data.endStation;
            entity.startTime = data.startTime;
            entity.endTime = data.endTime;
            entity.limit = data.limit;
            entity.line = data.line;
            entity.locationType = data.locationType;
            entity.time = data.time;
            entity.isShow = 1;
            entity.createTime = new Date();
            entity.updateTime = new Date();
            entity.source = data.source;
            entity.isEndTimeOptional = !!data.isEndTimeOptional;
            await entity.save();
        } else {
            Failed.throw(`请先创建指挥`);
        }
    }

    async update(data: TyphoonExtremeOperationUpdateDto) {
        const entity = await this.repo.typhoonExtremeOperations.findOne({ _id: data.id }).exec();
        if (!entity) {
            Failed.throw(`事件不存在`);
        }
        entity.actionType = data.actionType;
        entity.close = data.close;
        entity.distance = data.distance;
        entity.customPosition = data.customPosition;
        entity.description = data.description;
        entity.direction = data.direction;
        entity.startStation = data.startStation;
        entity.endStation = data.endStation;
        entity.startTime = data.startTime;
        entity.endTime = data.endTime;
        entity.limit = data.limit;
        entity.line = data.line;
        entity.locationType = data.locationType;
        entity.time = data.time;
        entity.isShow = data.isShow;
        entity.updateTime = new Date();
        entity.source = data.source;
        entity.actualEndTime = data.actualEndTime;
        entity.isEndTimeOptional = !!data.isEndTimeOptional;
        await entity.save();
    }

    async partialUpdate(data: Partial<TyphoonExtremeOperationUpdateDto> & { id: string }) {
        const entity = await this.repo.typhoonExtremeOperations.findOne({ _id: data.id }).exec();
        if (!entity) {
            Failed.throw(`运营调整不存在`);
        }

        // 遍历字段进行更新，排除 id 字段
        Object.keys(data).forEach(key => {
            if (key !== "id" && data[key] !== undefined) {
                entity[key] = data[key];
            }
        });

        entity.updateTime = new Date();
        await entity.save();
    }

    async batchUpdatePartial(params: BatchUpdateOperationParams) {
        const entities = await this.repo.typhoonExtremeOperations.find({ _id: params.ids }).exec();
        if (!entities || entities.length <= 0) {
            Failed.throw(`运营调整不存在`);
        }

        // 遍历字段进行更新，排除 id 字段
        for (const entity of entities) {
            Object.keys(params.data).forEach(key => {
                if (key !== "id" && params.data[key] !== undefined) {
                    entity[key] = params.data[key];
                }
            });
            entity.updateTime = new Date();
            await entity.save();
        }
    }

    async remove(id: string) {
        await this.repo.typhoonExtremeOperations.deleteOne({ _id: id }).exec();
    }

    async getAllDetail(): Promise<TyphoonExtremeOpDetailDto[]> {
        const command = await this.repo.typhoonCommands.findOne({ status: 0 }, {}, { sort: { createTime: -1 } }).exec();
        if (!command) return [];

        const list = await this.repo.typhoonExtremeOpDetails
            .find({ commandId: command._id.toString() }, {}, { sort: { createTime: -1 } })
            .exec();
        return list.map(u => TyphoonExtremeOpDetailDto.fromDoc(u));
    }

    async addDetail(data: TyphoonExtremeOpDetailCreateDto) {
        const command = await this.repo.typhoonCommands.findOne({ status: 0 }, {}, { sort: { createTime: -1 } }).exec();
        if (command) {
            const entity = new this.repo.typhoonExtremeOpDetails();
            entity.commandId = command._id.toString();
            entity.line = data.line;
            entity.isObstructing = data.isObstructing;
            entity.detail = data.detail;
            entity.createTime = new Date();
            entity.updateTime = new Date();
            await entity.save();
        } else {
            Failed.throw(`请先创建指挥`);
        }
    }
    async updateDetail(data: TyphoonExtremeOpDetailUpdateDto) {
        const entity = await this.repo.typhoonExtremeOpDetails.findOne({ line: data.line }).exec();
        if (!entity) {
            return this.addDetail(data);
        }
        entity.isObstructing = data.isObstructing;
        entity.detail = data.detail;
        entity.updateTime = new Date();
        await entity.save();
    }

    async removeDetail(line: string) {
        const command = await this.repo.typhoonCommands.findOne({ status: 0 }, {}, { sort: { createTime: -1 } }).exec();
        if (!command) {
            Failed.throw(`请先创建指挥`);
        }
        await this.repo.typhoonExtremeOpDetails.deleteOne({ line: line, commandId: command._id.toString() }).exec();
    }
}

export const logger = new Logger("TyphoonExtremeOperationService");
