import { Schema } from "@nestjs/mongoose";
import { ApiProperty } from "@nestjs/swagger";

@Schema()
export class MailCreateDto {
    @ApiProperty({ description: "标题" })
    title: string = "";
    @ApiProperty({ description: "内容" })
    content: string = "";
    @ApiProperty({ description: "类型" })
    type: string = "";
    @ApiProperty({ description: "子类型" })
    subType: string = "";
    @ApiProperty({ description: "线路" })
    typhoonLines: string[] = [];
    @ApiProperty({ description: "事件" })
    typhoonEvents: number[] = [];
}
