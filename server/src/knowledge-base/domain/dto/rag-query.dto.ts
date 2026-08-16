import { ApiProperty } from "@nestjs/swagger";
import { IsArray, IsIn, IsInt, IsOptional, IsString, Max, Min, ValidateNested } from "class-validator";
import { Type } from "class-transformer";
import { ChatHistoryItem } from "src/common/domain/chat-history.dto";

export { ChatHistoryItem };

export class RagQueryDto {
    @ApiProperty({ description: "用户问题" })
    @IsString()
    question: string;

    @ApiProperty({ description: "返回相关片段数量", required: false, default: 5 })
    @IsOptional()
    @IsInt()
    @Min(1)
    @Max(20)
    topK?: number;

    @ApiProperty({
        description: "知识分类过滤",
        required: false,
        enum: ["typhoon_case", "regulation", "emergency_plan", "other"],
    })
    @IsOptional()
    @IsIn(["typhoon_case", "regulation", "emergency_plan", "other"])
    category?: string;

    @ApiProperty({ description: "对话历史（最近N轮）", required: false, type: [ChatHistoryItem] })
    @IsOptional()
    @IsArray()
    @ValidateNested({ each: true })
    @Type(() => ChatHistoryItem)
    history?: ChatHistoryItem[];
}
