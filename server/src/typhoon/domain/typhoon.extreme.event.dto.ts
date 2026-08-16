import { ApiProperty } from "@nestjs/swagger";
import { TyphoonExtremeEventDocument } from "src/database/entity/typhoon.extreme.event.schema";
import { TyphoonExtremeEventUpdateDto } from "./typhoon.extreme.event.update.dto";

export class TyphoonExtremeEventDto extends TyphoonExtremeEventUpdateDto {
    @ApiProperty({ description: "创建时间" })
    createTime: Date = new Date();
    @ApiProperty({ description: "修改时间" })
    updateTime: Date = new Date();
    @ApiProperty({ description: "指挥ID" })
    commandId: string = "";

    static fromDoc(doc: TyphoonExtremeEventDocument): TyphoonExtremeEventDto {
        const ret = new TyphoonExtremeEventDto();
        ret.id = doc._id.toString();
        ret.commandId = doc.commandId;
        ret.customPosition = doc.customPosition;
        ret.description = doc.description;
        ret.direction = doc.direction;
        ret.startStation = doc.startStation;
        ret.endStation = doc.endStation;
        ret.eventType = doc.eventType;
        ret.images = doc.images;
        ret.line = doc.line;
        ret.locationType = doc.locationType;
        ret.otherEvent = doc.otherEvent;
        ret.severity = doc.severity;
        ret.urgentRepair = doc.urgentRepair;
        ret.urgentRepairStatus = doc.urgentRepairStatus;
        ret.updateTime = doc.updateTime;
        ret.createTime = doc.createTime;
        ret.startTime = doc.startTime;
        ret.endTime = doc.endTime;
        ret.isShow = doc.isShow;
        ret.effect = doc.effect;
        ret.effectDuration = doc.effectDuration;
        ret.terminated = doc.terminated;
        ret.trainNumber = doc.trainNumber;
        ret.source = doc.source;
        ret.repairUnits = doc.repairUnits;
        ret.responsiblePerson = doc.responsiblePerson;
        ret.contactPhone = doc.contactPhone;
        ret.supervision = doc.supervision;
        ret.associatedPoint = doc.associatedPoint;
        return ret;
    }
}
