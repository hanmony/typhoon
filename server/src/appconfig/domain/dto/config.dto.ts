import { ApiProperty } from "@nestjs/swagger";

export class ConfigDto {
    @ApiProperty({ description: "设置项名称" })
    name: string;
    @ApiProperty({ description: "设置项内容" })
    content: object;
}
