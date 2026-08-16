import { Schema } from "@nestjs/mongoose";
import { ApiProperty } from "@nestjs/swagger";

@Schema()
export class MailDto {
    @ApiProperty({ description: "ID" })
    id: string = "";
    @ApiProperty({ description: "标题" })
    title: string = "";
    @ApiProperty({ description: "内容" })
    content: string = "";
    @ApiProperty({ description: "发送人" })
    sender: string = "";
    @ApiProperty({ description: "接收人" })
    receiver: string = "";
    @ApiProperty({ description: "创建时间" })
    createTime: string = "";
    @ApiProperty({ description: "阅读时间" })
    readTime: Date = new Date();
    @ApiProperty({ description: "是否阅读" })
    isRead: number = 0;
    @ApiProperty({ description: "类型" })
    type: string = "";
    @ApiProperty({ description: "子类型" })
    subType: string = "";
    @ApiProperty({ description: "线路" })
    typhoonLines: string[] = [];
    @ApiProperty({ description: "事件" })
    typhoonEvents: number[] = [];
}
