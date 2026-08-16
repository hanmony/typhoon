import { ApiProperty } from "@nestjs/swagger";
import { TyphoonExtremeMessageDocument } from "src/database/entity/typhoon.extreme.message.schema";
import { UserDataDto } from "src/userman/domain/user.data.dto";
import { TyphoonExtremeMessageDto } from "./typhoon.extreme.message.dto";

export class TyphoonExtremeMessagePadDto extends TyphoonExtremeMessageDto {
    @ApiProperty({ description: "是否读取" })
    isRead: number = 0;

    static fromDoc(doc: TyphoonExtremeMessageDocument, user: UserDataDto = null): TyphoonExtremeMessagePadDto {
        const ret = new TyphoonExtremeMessagePadDto();
        ret.id = doc._id.toString();
        ret.commandId = doc.commandId;
        ret.type = doc.type;
        ret.title = doc.title;
        ret.content = doc.content;
        ret.lines = doc.lines;
        ret.eventIds = doc.eventIds;
        ret.updateTime = doc.updateTime;
        ret.createTime = doc.createTime;
        ret.isRead = doc.readUserIds.includes(user.id) ? 1 : 0;
        return ret;
    }
}
