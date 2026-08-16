import { ApiProperty } from "@nestjs/swagger";
import { TyphoonExtremeOperationCreateDto } from "./typhoon.extreme.operation.create.dto";

export class TyphoonExtremeOperationUpdateDto extends TyphoonExtremeOperationCreateDto {
    @ApiProperty({ description: "事件ID" })
    id: string = "";
    @ApiProperty({ description: "是否显示" })
    isShow: number = 1;
    @ApiProperty({ description: "运营真实恢复时间" })
    actualEndTime: Date = new Date();
}

export interface BatchUpdateOperationParams {
    data: Partial<TyphoonExtremeOperationUpdateDto>;
    ids: string[];
}
