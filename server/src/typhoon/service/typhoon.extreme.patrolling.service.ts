import { Injectable, Logger } from "@nestjs/common";
import { RepoService } from "src/database/service/repo/repo.service";
import { TyphoonPatrollingTourCreateDto, TyphoonPatrollingTourDto } from "../domain/typhoon.extreme.patrolling.dto";
import { TyphoonCommandService } from "./typhoon.command.service";
import { Failed } from "src/diagnostics/lib/failed";

@Injectable()
export class TyphoonPatrollingService {
    constructor(
        private readonly repo: RepoService,
        private readonly typhoonCommandService: TyphoonCommandService,
    ) {}

    protected isEditing = [];

    protected checkIsEditingAndSetEdit(line: string) {
        if (this.isEditing[line] == null) {
            this.isEditing[line] = 0;
        }
        if (this.isEditing[line] == 1) {
            Failed.throw(`当前巡道编辑中，请稍后再试`);
        }
        this.isEditing[line] = 1;
    }

    protected closeEdit(line: string) {
        this.isEditing[line] = 0;
    }

    async getTours(): Promise<TyphoonPatrollingTourDto[]> {
        const commandDoc = await this.typhoonCommandService.getCurrentCommand();
        if (!commandDoc) {
            Failed.throw(`当前指挥已结束`);
        }
        const docs = await this.repo.typhoonPatrollingTour
            .find({ commandId: commandDoc._id.toString() })
            .sort({ line: -1, serialNumber: 1 })
            .exec();
        const allTours = docs.map(u => TyphoonPatrollingTourDto.fromDoc(u));
        return allTours;
        // return allTours.filter(omitBefore24Hours);
    }

    async add(data: TyphoonPatrollingTourCreateDto) {
        this.checkIsEditingAndSetEdit(data.line);
        const commandDoc = await this.typhoonCommandService.getCurrentCommand();
        if (!commandDoc) {
            Failed.throw(`当前指挥已结束`);
        }
        let serialNumber = 1;
        const docs = await this.repo.typhoonPatrollingTour
            .find({ commandId: commandDoc._id.toString(), line: data.line })
            .sort({ serialNumber: 1 })
            .exec();
        //序号有漏补上，没有顺延
        for (let i = 0; i < docs.length; i++) {
            const doc = docs[i];
            if (doc.serialNumber != serialNumber) {
                break;
            }
            serialNumber++;
        }
        const entity = new this.repo.typhoonPatrollingTour();
        entity.commandId = commandDoc._id.toString();
        entity.speed = data.speed;
        entity.identifiers = data.identifiers;
        entity.line = data.line;
        entity.serialNumber = serialNumber;
        entity.startTime = data.startTime;
        entity.createTime = new Date();
        await entity.save();
        this.closeEdit(data.line);
        return TyphoonPatrollingTourDto.fromDoc(entity);
    }

    async remove(id) {
        const commandDoc = await this.typhoonCommandService.getCurrentCommand();
        if (!commandDoc) {
            Failed.throw(`当前指挥已结束`);
        }
        const entity = await this.repo.typhoonPatrollingTour.findOne({ _id: id });
        if (entity) {
            this.checkIsEditingAndSetEdit(entity.line);
            await this.repo.typhoonPatrollingTour.deleteOne({ _id: id });
            this.closeEdit(entity.line);
        }
    }

    async removeAllByLine(line) {
        this.checkIsEditingAndSetEdit(line);
        const commandDoc = await this.typhoonCommandService.getCurrentCommand();
        if (!commandDoc) {
            Failed.throw(`当前指挥已结束`);
        }
        await this.repo.typhoonPatrollingTour.deleteMany({ commandId: commandDoc._id.toString(), line: line });
        this.closeEdit(line);
    }
}

export const typhoonPatrollingLogger = new Logger("TyphoonPatrollingService");
