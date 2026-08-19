import { ApiProperty } from "@nestjs/swagger";
import { IsBoolean, IsOptional, IsString } from "class-validator";

/**
 * AI 研判请求（POST /alert-analyzer/stream）
 * 字段语义（步骤 13 编排接入后生效）：
 *  - question：用户补充问题（可选），追加到研判 prompt
 *  - autoRun：自动研判（可选，默认 true）——false 时只做数据聚合/案例匹配，不生成 LLM 报告
 *  - commandId：关联的指挥/预警命令 ID（可选），用于定位当前台风上下文
 */
export class AlertAnalyzerDto {
    @ApiProperty({ required: false, description: "用户补充问题（可选）" })
    @IsOptional()
    @IsString()
    question?: string;

    @ApiProperty({ required: false, description: "是否自动生成研判报告（默认 true）" })
    @IsOptional()
    @IsBoolean()
    autoRun?: boolean;

    @ApiProperty({ required: false, description: "关联指挥/预警命令 ID（可选）" })
    @IsOptional()
    @IsString()
    commandId?: string;
}
