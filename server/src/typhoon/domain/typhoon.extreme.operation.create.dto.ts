import { ApiProperty } from "@nestjs/swagger";

export class TyphoonExtremeOperationCreateDto {
    @ApiProperty({ description: "车场位置" })
    customPosition: string = "";
    @ApiProperty({ description: "事件说明" })
    description: string = "";
    @ApiProperty({ description: "上下行" })
    direction: string = "";
    @ApiProperty({ description: "起始站点" })
    startStation: string = "";
    @ApiProperty({ description: "结束站点" })
    endStation: string = "";
    @ApiProperty({ description: "地点类型" })
    locationType: string = "";
    //停运
    @ApiProperty({ description: "运营调整类型" })
    actionType: string = "";
    @ApiProperty({ description: "运营调整类型" })
    close: number = 0;
    @ApiProperty({ description: "距离" })
    distance: number = 0;
    @ApiProperty({ description: "开始时间" })
    startTime: Date = new Date();
    @ApiProperty({ description: "结束时间" })
    endTime: Date = new Date();
    @ApiProperty({ description: "limit" })
    limit: number = 0;
    @ApiProperty({ description: "线路" })
    line: string = "";
    @ApiProperty({ description: "时间段" })
    time: Date[] = [];
    @ApiProperty({ description: "来源" })
    source: string = "";
    @ApiProperty({ description: "是否计划恢复时间未定" })
    isEndTimeOptional: boolean = false;
}
