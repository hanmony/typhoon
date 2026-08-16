import { ApiProperty } from "@nestjs/swagger";
import { TyphoonExtremeEventCreateDto } from "./typhoon.extreme.event.create.dto";

export class TyphoonExtremeEventUpdateDto extends TyphoonExtremeEventCreateDto {
    @ApiProperty({ description: "事件ID" })
    id: string = "";
    @ApiProperty({ description: "抢修状态" })
    urgentRepairStatus: number = 0;
    @ApiProperty({ description: "是否显示" })
    isShow: number = 1;
    @ApiProperty({ description: "是否已结束" })
    terminated: number = 0;
    @ApiProperty({ description: "结束时间" })
    endTime: Date = new Date();
}

export interface BatchUpdateEventParams {
    data: Partial<TyphoonExtremeEventUpdateDto>;
    ids: string[];
}
