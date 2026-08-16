import { ApiProperty } from "@nestjs/swagger";
import { TyphoonExtremeMessageDocument } from "src/database/entity/typhoon.extreme.message.schema";
import { TyphoonExtremeMessageUpdateDto } from "./typhoon.extreme.message.update.dto";

export class TyphoonExtremeMessageDto extends TyphoonExtremeMessageUpdateDto {
    @ApiProperty({ description: "创建时间" })
    createTime: Date = new Date();
    @ApiProperty({ description: "修改时间" })
    updateTime: Date = new Date();
    @ApiProperty({ description: "指挥ID" })
    commandId: string = "";

    static fromDoc(doc: TyphoonExtremeMessageDocument): TyphoonExtremeMessageDto {
        const ret = new TyphoonExtremeMessageDto();
        ret.id = doc._id.toString();
        ret.commandId = doc.commandId;
        ret.type = doc.type;
        ret.title = doc.title;
        ret.content = doc.content;
        ret.lines = doc.lines;
        ret.eventIds = doc.eventIds;
        ret.updateTime = doc.updateTime;
        ret.createTime = doc.createTime;
        return ret;
    }
}
