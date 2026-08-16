import { Injectable, Logger } from "@nestjs/common";
import { RepoService } from "src/database/service/repo/repo.service";
import { Failed } from "src/diagnostics/lib/failed";
import { TyphoonExtremeEventDto } from "../domain/typhoon.extreme.event.dto";
import { TyphoonExtremeEventCreateDto } from "../domain/typhoon.extreme.event.create.dto";
import { BatchUpdateEventParams, TyphoonExtremeEventUpdateDto } from "../domain/typhoon.extreme.event.update.dto";
import { TyphoonExtremeEventInfoDto } from "../domain/typhoon.extreme.event.info.dto";
import { getTodayMidnight, getTomorrowMidnight, getYesterdayMidnight } from "src/common/lib/util";
@Injectable()
export class TyphoonExtremeEventService {
    constructor(private readonly repo: RepoService) {}

    async getInfo(line: string): Promise<TyphoonExtremeEventInfoDto> {
        const info = new TyphoonExtremeEventInfoDto();
        const command = await this.repo.typhoonCommands.findOne({ status: 0 }, {}, { sort: { createTime: -1 } }).exec();
        if (command) {
            const list = await this.repo.typhoonExtremeEvents
                .find({ commandId: command._id.toString(), line: line }, {}, { sort: { createTime: -1 } })
                .exec();
            info.list = list.map(u => TyphoonExtremeEventDto.fromDoc(u));
            if (info.list.length > 0) {
                let totalNumber = 0;
                let todayNumber = 0;
                let yesterdayNumber = 0;
                let severityTodayNumber = 0;
                let severityYesterdayNumber = 0;
                const yesterday = getYesterdayMidnight();
                const today = getTodayMidnight();
                const tomorrow = getTomorrowMidnight();
                info.list.forEach(item => {
                    if (item.isShow == 1) {
                        totalNumber++;
                        if (item.startTime >= yesterday && item.startTime < today) {
                            yesterdayNumber++;
                            if (item.severity === 1) {
                                severityYesterdayNumber++;
                            }
                        } else if (item.startTime >= today && item.startTime < tomorrow) {
                            todayNumber++;
                            if (item.severity === 1) {
                                severityTodayNumber++;
                            }
                        }
                    }
                });
                //今日事件
                if (totalNumber > 0) {
                    info.todayNumber = todayNumber;
                    info.todayPercentage = ((todayNumber / totalNumber) * 100).toFixed(2) + "%";
                    if (yesterdayNumber > 0) {
                        info.todayPercentageGreaterThanYesterday =
                            (((todayNumber - yesterdayNumber) / yesterdayNumber) * 100).toFixed(2) + "%";
                        if (todayNumber > yesterdayNumber) {
                            info.todayGreaterThanYesterday = true;
                        }
                    } else {
                        if (todayNumber > 0) {
                            info.todayPercentageGreaterThanYesterday = "+" + todayNumber + "个";
                            info.todayGreaterThanYesterday = true;
                        } else {
                            info.todayPercentageGreaterThanYesterday = "-0个";
                        }
                    }
                    //重大事件
                    info.severityNumber = severityTodayNumber;
                    info.severityPercentage = ((severityTodayNumber / totalNumber) * 100).toFixed(2) + "%";
                    if (severityYesterdayNumber > 0) {
                        info.severityPercentageGreaterThanYesterday =
                            (((severityTodayNumber - severityYesterdayNumber) / severityYesterdayNumber) * 100).toFixed(
                                2,
                            ) + "%";
                        if (severityTodayNumber > severityYesterdayNumber) {
                            info.severityGreaterThanYesterday = true;
                        }
                    } else {
                        if (severityTodayNumber > 0) {
                            info.severityPercentageGreaterThanYesterday = "+" + severityTodayNumber + "个";
                            info.severityGreaterThanYesterday = true;
                        } else {
                            info.severityPercentageGreaterThanYesterday = "-0个";
                        }
                    }
                }
            }
        }
        return info;
    }

    async getActive(): Promise<TyphoonExtremeEventDto[]> {
        const command = await this.repo.typhoonCommands.findOne({ status: 0 }, {}, { sort: { createTime: -1 } }).exec();
        if (!command) return [];
        const list = await this.repo.typhoonExtremeEvents
            .find({ commandId: command._id.toString(), isShow: 1, terminated: 0 }, {}, { sort: { createTime: -1 } })
            .exec();
        return list.map(u => TyphoonExtremeEventDto.fromDoc(u));
    }

    async getAll(): Promise<TyphoonExtremeEventDto[]> {
        let list = [];
        const command = await this.repo.typhoonCommands.findOne({ status: 0 }, {}, { sort: { createTime: -1 } }).exec();
        if (command) {
            list = await this.repo.typhoonExtremeEvents
                .find({ commandId: command._id.toString() }, {}, { sort: { createTime: -1 } })
                .exec();
        }
        return list.map(u => TyphoonExtremeEventDto.fromDoc(u));
    }

    async add(data: TyphoonExtremeEventCreateDto) {
        const command = await this.repo.typhoonCommands.findOne({ status: 0 }, {}, { sort: { createTime: -1 } }).exec();
        if (command) {
            const entity = new this.repo.typhoonExtremeEvents();
            entity.commandId = command._id.toString();
            entity.customPosition = data.customPosition;
            entity.description = data.description;
            entity.direction = data.direction;
            entity.startStation = data.startStation;
            entity.endStation = data.endStation;
            entity.eventType = data.eventType;
            entity.images = data.images;
            entity.line = data.line;
            entity.locationType = data.locationType;
            entity.otherEvent = data.otherEvent;
            entity.severity = data.severity;
            entity.urgentRepair = data.urgentRepair;
            entity.effect = data.effect;
            entity.effectDuration = data.effectDuration;
            entity.trainNumber = data.trainNumber;
            entity.urgentRepairStatus = 0;
            entity.isShow = 1;
            entity.terminated = 0;
            entity.startTime = data.startTime;
            entity.endTime = null;
            entity.createTime = new Date();
            entity.updateTime = new Date();
            entity.source = data.source;
            entity.repairUnits = data.repairUnits;
            entity.responsiblePerson = data.responsiblePerson;
            entity.contactPhone = data.contactPhone;
            entity.supervision = data.supervision;
            entity.associatedPoint = data.associatedPoint;
            await entity.save();
        } else {
            Failed.throw(`请先创建指挥`);
        }
    }

    async update(data: TyphoonExtremeEventUpdateDto) {
        const entity = await this.repo.typhoonExtremeEvents.findOne({ _id: data.id }).exec();
        if (!entity) {
            Failed.throw(`事件不存在`);
        }
        entity.customPosition = data.customPosition;
        entity.description = data.description;
        entity.direction = data.direction;
        entity.startStation = data.startStation;
        entity.endStation = data.endStation;
        entity.eventType = data.eventType;
        entity.images = data.images;
        entity.line = data.line;
        entity.locationType = data.locationType;
        entity.otherEvent = data.otherEvent;
        entity.severity = data.severity;
        entity.urgentRepair = data.urgentRepair;
        entity.urgentRepairStatus = data.urgentRepairStatus;
        entity.isShow = data.isShow;
        entity.terminated = data.terminated;
        entity.effect = data.effect;
        entity.effectDuration = data.effectDuration;
        entity.trainNumber = data.trainNumber;
        entity.startTime = data.startTime;
        entity.endTime = data.endTime;
        entity.updateTime = new Date();
        entity.source = data.source;
        entity.repairUnits = data.repairUnits;
        entity.responsiblePerson = data.responsiblePerson;
        entity.contactPhone = data.contactPhone;
        entity.supervision = data.supervision;
        entity.associatedPoint = data.associatedPoint;
        await entity.save();
    }

    async partialUpdate(data: Partial<TyphoonExtremeEventUpdateDto> & { id: string }) {
        const entity = await this.repo.typhoonExtremeEvents.findOne({ _id: data.id }).exec();
        if (!entity) {
            Failed.throw(`事件不存在`);
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

    async batchUpdatePartial(params: BatchUpdateEventParams) {
        const entities = await this.repo.typhoonExtremeEvents.find({ _id: params.ids }).exec();
        if (!entities || entities.length <= 0) {
            Failed.throw(`事件不存在`);
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
        await this.repo.typhoonExtremeEvents.deleteOne({ _id: id }).exec();
    }

    async deleteAll() {
        await this.repo.typhoonExtremeEvents.deleteMany({ updateTime: { $lt: new Date(Date.now()) } });
    }
}

export const logger = new Logger("TyphoonExtremeEventService");
