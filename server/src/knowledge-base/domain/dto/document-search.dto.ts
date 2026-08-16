import { ApiProperty } from "@nestjs/swagger";
import { IsIn, IsInt, IsOptional, IsString, Min } from "class-validator";

export class DocumentSearchDto {
    @ApiProperty({ required: false, description: "文件名模糊搜索" })
    @IsOptional()
    @IsString()
    name?: string;

    @ApiProperty({ required: false, description: "文件类型" })
    @IsOptional()
    @IsString()
    fileType?: string;

    @ApiProperty({ required: false, description: "状态过滤" })
    @IsOptional()
    @IsInt()
    status?: number;

    @ApiProperty({
        required: false,
        description: "分类过滤",
        enum: ["typhoon_case", "regulation", "emergency_plan", "other"],
    })
    @IsOptional()
    @IsIn(["typhoon_case", "regulation", "emergency_plan", "other"])
    category?: string;

    @ApiProperty({ default: 1 })
    @IsInt()
    @Min(1)
    page: number;

    @ApiProperty({ default: 10 })
    @IsInt()
    @Min(1)
    pageSize: number;
}
