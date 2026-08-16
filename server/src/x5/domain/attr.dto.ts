import { ApiProperty } from "@nestjs/swagger";

export class AttrDto {
    @ApiProperty({ description: "附件名称" })
    attrName: string = "";
    @ApiProperty({ description: "下载路径" })
    attrPath: string = "";
}
