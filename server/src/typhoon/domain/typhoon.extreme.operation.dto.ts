import { ApiProperty } from "@nestjs/swagger";
import { TyphoonExtremeOperationUpdateDto } from "./typhoon.extreme.operation.update.dto";
import { TyphoonExtremeOperationDocument } from "src/database/entity/typhoon.extreme.operation.schema";

export class TyphoonExtremeOperationDto extends TyphoonExtremeOperationUpdateDto {
    @ApiProperty({ description: "创建时间" })
    createTime: Date = new Date();
    @ApiProperty({ description: "修改时间" })
    updateTime: Date = new Date();
    @ApiProperty({ description: "指挥ID" })
    commandId: string = "";

    static fromDoc(doc: TyphoonExtremeOperationDocument): TyphoonExtremeOperationDto {
        const ret = new TyphoonExtremeOperationDto();
        ret.id = doc._id.toString();
        ret.commandId = doc.commandId;
        ret.actionType = doc.actionType;
        ret.close = doc.close;
        ret.customPosition = doc.customPosition;
        ret.description = doc.description;
        ret.direction = doc.direction;
        ret.distance = doc.distance;
        ret.startStation = doc.startStation;
        ret.endStation = doc.endStation;
        ret.startTime = doc.startTime;
        ret.endTime = doc.endTime;
        ret.limit = doc.limit;
        ret.line = doc.line;
        ret.locationType = doc.locationType;
        ret.time = doc.time;
        ret.updateTime = doc.updateTime;
        ret.createTime = doc.createTime;
        ret.isShow = doc.isShow;
        ret.source = doc.source;
        ret.actualEndTime = doc.actualEndTime;
        ret.isEndTimeOptional = doc.isEndTimeOptional;
        return ret;
    }
}
