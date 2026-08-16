import { ApiProperty } from "@nestjs/swagger";
import { IsArray, IsOptional, IsString } from "class-validator";

export class UpdateDocumentDto {
    @ApiProperty({ required: false, description: "自定义标签", type: [String] })
    @IsOptional()
    @IsArray()
    @IsString({ each: true })
    manualTags?: string[];

    @ApiProperty({ required: false, description: "文档摘要" })
    @IsOptional()
    @IsString()
    summary?: string;
}
