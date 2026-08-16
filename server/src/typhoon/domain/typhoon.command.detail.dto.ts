import { ApiProperty } from "@nestjs/swagger";
import { TyphoonCommandDto } from "./typhoon.command.dto";
import { TyphoonDutyDto } from "./typhoon.duty.dto";
import { TyphoonExtremeEventDto } from "./typhoon.extreme.event.dto";
import { TyphoonExtremeMessageDto } from "./typhoon.extreme.message.dto";
import { TyphoonExtremeOperationDto } from "./typhoon.extreme.operation.dto";
import { TyphoonPatrollingTourDto } from "./typhoon.extreme.patrolling.dto";
import { TyphoonSevereWeatherNewHistoryDto } from "./typhoon.severe.weather.new.history.dto";
import { TyphoonTwoDto } from "./typhoon.two.dto";

export class TyphoonCommandDetailDto {
    @ApiProperty({ description: "指挥基本信息" })
    doc: TyphoonCommandDto;

    @ApiProperty({ description: "台风值班列表" })
    typhoonDutys: TyphoonDutyDto[];

    @ApiProperty({ description: "台风事件列表" })
    typhoonExtremeEvents: TyphoonExtremeEventDto[];

    @ApiProperty({ description: "台风消息列表" })
    typhoonExtremeMessages: TyphoonExtremeMessageDto[];

    @ApiProperty({ description: "台风运营调整列表" })
    typhoonExtremeOperations: TyphoonExtremeOperationDto[];

    @ApiProperty({ description: "台风巡道列表" })
    typhoonPatrollings: TyphoonPatrollingTourDto[];

    @ApiProperty({ description: "灾害天气列表" })
    severeWeathers: TyphoonSevereWeatherNewHistoryDto[];

    @ApiProperty({ description: "台风信息" })
    typhoon: TyphoonTwoDto;

    // 添加序列化方法
    // toJSON() {
    //     return {
    //         doc: this.doc,
    //         eventsMap: Object.fromEntries(this.eventsMap),
    //         pathInfo: this.pathInfo
    //     };
    // }
}
