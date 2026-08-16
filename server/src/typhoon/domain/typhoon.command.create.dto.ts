import { ApiProperty } from "@nestjs/swagger";

export class TyphoonCommandCreateDto {
    @ApiProperty({ description: "指挥标题" })
    name: string = "";
    @ApiProperty({ description: "是否模拟" })
    isSimulated: number = 0;
    @ApiProperty({ description: "模拟开始时间" })
    simulateStartTime: string = "";
}
