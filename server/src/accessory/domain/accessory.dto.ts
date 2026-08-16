import { ApiProperty } from "@nestjs/swagger";

export enum AccessoryType {
    file = "file",
    approval = "approval",
}

export class AccessoryDto {
    @ApiProperty({ description: "附件类型" })
    type: AccessoryType = AccessoryType.file;
    @ApiProperty({ description: "附件标识" })
    aid: string;
    @ApiProperty({ description: "附件名称, 文件时为文件名，审批时为审批类型" })
    filename: string;
    @ApiProperty({ description: "附件缩略图" })
    thumbnail: string;
}
