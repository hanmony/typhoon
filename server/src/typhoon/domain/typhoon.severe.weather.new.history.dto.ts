import { ApiProperty } from "@nestjs/swagger";
import { TyphoonSevereWeatherNewDto } from "./typhoon.severe.weather.new.dto";
import { TyphoonSevereWeatherNewHistoryDocument } from "src/database/entity/typhoon.severe.weather.new.history.schema";

export class TyphoonSevereWeatherNewHistoryDto extends TyphoonSevereWeatherNewDto {
    @ApiProperty({ description: "预警是否结束" })
    isEnd: number = 0;
    @ApiProperty({ description: "预警结束时间" })
    endtime: Date = new Date();

    static fromHistoryDoc(doc: TyphoonSevereWeatherNewHistoryDocument): TyphoonSevereWeatherNewHistoryDto {
        const ret = new TyphoonSevereWeatherNewHistoryDto();
        // 复制所有预警字段
        ret.weatherId = doc.weatherId;
        ret.senderName = doc.senderName;
        ret.issuedTime = doc.issuedTime;
        ret.messageType = doc.messageType;
        ret.eventType = doc.eventType;
        ret.urgency = doc.urgency;
        ret.severity = doc.severity;
        ret.certainty = doc.certainty;
        ret.icon = doc.icon;
        ret.color = doc.color;
        ret.effectiveTime = doc.effectiveTime;
        ret.onsetTime = doc.onsetTime;
        ret.expireTime = doc.expireTime;
        ret.headline = doc.headline;
        ret.description = doc.description;
        ret.criteria = doc.criteria;
        ret.instruction = doc.instruction;
        ret.responseTypes = doc.responseTypes;
        ret.commandId = doc.commandId;
        ret.isEnd = doc.isEnd;
        ret.endtime = doc.endtime;
        return ret;
    }
}
