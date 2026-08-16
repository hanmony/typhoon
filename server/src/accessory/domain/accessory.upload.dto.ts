import { ApiProperty } from "@nestjs/swagger";

export class AccessoryUploadDto {
    @ApiProperty({ description: "附件类型: 申请，邮件等等" })
    hostType: string;
    @ApiProperty({ description: "附件标识: 申请ID，邮件ID等等" })
    hostId: string;
    @ApiProperty({ description: "附件原始文件名" })
    filename: string;
    @ApiProperty({ description: "附件本地路径" })
    localPath: string;
}
