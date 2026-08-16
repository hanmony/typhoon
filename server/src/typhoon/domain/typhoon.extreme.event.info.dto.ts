import { ApiProperty } from "@nestjs/swagger";
import { TyphoonExtremeEventDto } from "./typhoon.extreme.event.dto";

export class TyphoonExtremeEventInfoDto {
    //今日事件
    @ApiProperty({ description: "今日事件数量（isShow=1进行统计）" })
    todayNumber: number = 0;
    @ApiProperty({ description: "今日事件数量占比" })
    todayPercentage: string = "0%";
    @ApiProperty({ description: "今日事件同比昨日" })
    todayPercentageGreaterThanYesterday: string = "-0%";
    @ApiProperty({ description: "今日事件同比昨日是否变多" })
    todayGreaterThanYesterday: boolean = false;
    //重大事件
    @ApiProperty({ description: "重大事件数量（isShow=1进行统计）" })
    severityNumber: number = 0;
    @ApiProperty({ description: "重大事件数量占比" })
    severityPercentage: string = "0%";
    @ApiProperty({ description: "重大事件同比昨日" })
    severityPercentageGreaterThanYesterday: string = "-0%";
    @ApiProperty({ description: "重大事件同比昨日是否变多" })
    severityGreaterThanYesterday: boolean = false;
    //事件列表
    @ApiProperty({ description: "事件列表", type: [TyphoonExtremeEventDto] })
    list: TyphoonExtremeEventDto[] = [];
}
