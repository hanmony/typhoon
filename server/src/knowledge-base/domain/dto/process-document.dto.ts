import { ApiProperty } from "@nestjs/swagger";
import { IsIn, IsInt, IsOptional, IsString, Max, Min } from "class-validator";

export class ProcessDocumentDto {
    @ApiProperty({ description: "文档 ID" })
    @IsString()
    documentId: string;

    @ApiProperty({
        description: "分段策略。auto=按分类自动选择，paragraph=段落累积，sliding_window=滑动窗口",
        required: false,
        default: "auto",
        enum: ["auto", "paragraph", "sliding_window"],
    })
    @IsOptional()
    @IsIn(["auto", "paragraph", "sliding_window"])
    strategy?: "auto" | "paragraph" | "sliding_window";

    @ApiProperty({ description: "分段长度（字符数）", required: false, minimum: 100, maximum: 5000 })
    @IsOptional()
    @IsInt()
    @Min(100)
    @Max(5000)
    chunkSize?: number;

    @ApiProperty({ description: "重叠长度（字符数）", required: false, minimum: 0, maximum: 1000 })
    @IsOptional()
    @IsInt()
    @Min(0)
    @Max(1000)
    overlap?: number;
}
