import { ApiProperty } from "@nestjs/swagger";

export class TyphoonExtremeMessageCreateDto {
    @ApiProperty({ description: "标题" })
    title: string = "";
    @ApiProperty({ description: "内容" })
    content: string = "";
    @ApiProperty({ description: "类型" })
    type: string = "";
    @ApiProperty({ description: "线路" })
    lines: string[] = [];
    @ApiProperty({ description: "事件" })
    eventIds: string[] = [];
}
