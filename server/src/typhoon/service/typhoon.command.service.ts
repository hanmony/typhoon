import { Injectable, Logger } from "@nestjs/common";
import { RepoService } from "src/database/service/repo/repo.service";
import { TyphoonCommandCreateDto } from "../domain/typhoon.command.create.dto";
import { Failed } from "src/diagnostics/lib/failed";
import { TyphoonCommandDto } from "../domain/typhoon.command.dto";
import { TyphoonCommandDocument } from "src/database/entity/typhoon.command.schema";
import { WebSocketService } from "src/websocket/service/websocket.service";
@Injectable()
export class TyphoonCommandService {
    constructor(
        private readonly repo: RepoService,
        private readonly webSocketService: WebSocketService,
    ) {}

    async getInfo(): Promise<TyphoonCommandDto[]> {
        const list = [];
        // const entity = await this.repo.typhoonCommands.findOne({ status: 0 }, {}, { createTime: -1 }).exec();
        const entity = await this.getCurrentCommand();
        if (entity) {
            list.push(TyphoonCommandDto.fromDoc(entity));
        }
        return list;
    }

    async getCurrentCommand(): Promise<TyphoonCommandDocument> {
        const entity = await this.repo.typhoonCommands.findOne({ status: 0 }, {}, { createTime: -1 }).exec();
        return entity;
    }

    async add(data: TyphoonCommandCreateDto) {
        const old = await this.getCurrentCommand();
        if (old) {
            Failed.throw(`存在进行中的指挥，请先关闭`);
        }
        const entity = new this.repo.typhoonCommands();
        entity.name = data.name;
        entity.startTime = new Date();
        entity.endTime = new Date();
        entity.isSimulated = data.isSimulated;
        if (data.isSimulated) {
            entity.simulateStartTime = new Date(data.simulateStartTime);
        }
        entity.status = 0;
        await entity.save();
    }

    async updateEmergencyResponse(data: Partial<TyphoonCommandDto>) {
        const old = await this.getCurrentCommand();
        if (old) {
            old.municipalDegree = data.municipalDegree || "";
            old.municipalFlag = data.municipalFlag ? 1 : 0;
            old.corporateDegree = data.corporateDegree || "";
            old.corporateFlag = data.corporateFlag ? 1 : 0;
            await old.save();

            // WebSocket消息推送
            this.webSocketService.broadcastEmergencyResponseUpdate();
        }
    }

    async updateSimulateStartTime(t: string) {
        const old = await this.getCurrentCommand();
        if (t) {
            old.simulateStartTime = new Date(t);
            await old.save();
            this.webSocketService.broadcastSimulateStartTimeUpdate();
        }
    }

    async close() {
        const old = await this.getCurrentCommand();
        if (old) {
            old.endTime = new Date();
            old.status = 1;
            await old.save();
        }
    }
}

export const logger = new Logger("TyphoonCommandService");
