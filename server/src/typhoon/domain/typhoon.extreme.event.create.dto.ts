import { ApiProperty } from "@nestjs/swagger";

export class TyphoonExtremeEventCreateDto {
    @ApiProperty({ description: "自定义位置" })
    customPosition: string = "";
    @ApiProperty({ description: "事件说明" })
    description: string = "";
    @ApiProperty({ description: "上下行" })
    direction: string = "";
    @ApiProperty({ description: "起始站点" })
    startStation: string = "";
    @ApiProperty({ description: "结束站点" })
    endStation: string = "";
    @ApiProperty({ description: "事件类型" })
    eventType: string = "";
    @ApiProperty({ description: "图片" })
    images: string[] = [];
    @ApiProperty({ description: "地点类型" })
    locationType: string = "";
    @ApiProperty({ description: "严重程度" })
    severity: number = 0;
    @ApiProperty({ description: "线路" })
    line: string = "";
    @ApiProperty({ description: "其他时间" })
    otherEvent: string = "";
    @ApiProperty({ description: "需要抢修" })
    urgentRepair: number = 0;
    @ApiProperty({ description: "发生时间" })
    startTime: Date = new Date();
    @ApiProperty({ description: "是否影响运营" })
    effect = 0;
    @ApiProperty({
        description: `
        影响运营时间
        { label: '预计5分钟以上', value: 1 },
        { label: '预计15分钟以上', value: 2 },
        { label: '预计30分钟以上', value: 3 },`,
    })
    effectDuration = 0;
    @ApiProperty({ description: "列车号" })
    trainNumber: string = "";
    @ApiProperty({ description: "来源" })
    source: string = "";
    @ApiProperty({ description: "抢修单位", type: [String] })
    repairUnits: string[] = [];
    @ApiProperty({ description: "负责人" })
    responsiblePerson: string = "";
    @ApiProperty({ description: "联系电话" })
    contactPhone: string = "";
    @ApiProperty({ description: "督办" })
    supervision: boolean = false;
    @ApiProperty({ description: "关联点" })
    associatedPoint: string = "";
}
