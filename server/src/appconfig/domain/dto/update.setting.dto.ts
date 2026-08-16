import { ApiProperty } from "@nestjs/swagger";
import { IsNotEmpty } from "class-validator";

/**
 * 更新配置请求
 */
export class UpdateSettingDto {
    @ApiProperty({ description: "配置名", type: String })
    @IsNotEmpty()
    name: string;

    @ApiProperty({ description: "配置值", type: String })
    @IsNotEmpty()
    value: string;
}
