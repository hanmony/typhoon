import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { IsString, IsOptional, IsIn } from "class-validator";

export class CreateLlmModelDto {
    @ApiProperty({ description: "显示名称" })
    @IsString()
    name: string;

    @ApiProperty({ description: "API 地址" })
    @IsString()
    baseUrl: string;

    @ApiProperty({ description: "API Key" })
    @IsString()
    apiKey: string;

    @ApiProperty({ description: "模型 ID" })
    @IsString()
    model: string;
}

export class UpdateLlmModelDto {
    @ApiPropertyOptional({ description: "显示名称" })
    @IsOptional()
    @IsString()
    name?: string;

    @ApiPropertyOptional({ description: "API 地址" })
    @IsOptional()
    @IsString()
    baseUrl?: string;

    @ApiPropertyOptional({ description: "API Key（留空不修改）" })
    @IsOptional()
    @IsString()
    apiKey?: string;

    @ApiPropertyOptional({ description: "模型 ID" })
    @IsOptional()
    @IsString()
    model?: string;
}

export class SetLlmModelRoleDto {
    @ApiProperty({ description: "角色", enum: ["default-large", "default-small"] })
    @IsString()
    @IsIn(["default-large", "default-small"])
    role: "default-large" | "default-small";
}

export class TestLlmModelDto {
    @ApiProperty({ description: "API 地址" })
    @IsString()
    baseUrl: string;

    @ApiProperty({ description: "API Key" })
    @IsString()
    apiKey: string;

    @ApiProperty({ description: "模型 ID" })
    @IsString()
    model: string;
}
