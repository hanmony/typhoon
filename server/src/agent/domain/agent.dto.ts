import { ApiProperty } from "@nestjs/swagger";
import { IsArray, IsIn, IsOptional, IsString, MaxLength, ArrayMaxSize, ValidateNested } from "class-validator";
import { Type } from "class-transformer";

export class AgentHistoryItem {
    @ApiProperty({ enum: ["user", "assistant"] })
    @IsIn(["user", "assistant"])
    role: "user" | "assistant";

    @ApiProperty()
    @IsString()
    @MaxLength(2000)
    content: string;
}

export class AgentQueryDto {
    @ApiProperty({ description: "用户问题" })
    @IsString()
    @MaxLength(500)
    question: string;

    @ApiProperty({ description: "对话历史（最近N轮）", required: false, type: [AgentHistoryItem] })
    @IsOptional()
    @IsArray()
    @ArrayMaxSize(10)
    @ValidateNested({ each: true })
    @Type(() => AgentHistoryItem)
    history?: AgentHistoryItem[];

    @ApiProperty({ description: "调用来源：cocc（默认）或 library", required: false, enum: ["cocc", "library"] })
    @IsOptional()
    @IsString()
    @IsIn(["cocc", "library"])
    from?: string;

    @ApiProperty({ description: "指定模型 ID（空则用默认模型）", required: false })
    @IsOptional()
    @IsString()
    modelId?: string;
}
