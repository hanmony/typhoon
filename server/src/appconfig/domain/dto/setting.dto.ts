import { ApiProperty } from "@nestjs/swagger";

export class SettingDto {
    @ApiProperty({ description: "设置项名称" })
    name: string;
    @ApiProperty({ description: "设置项标签" })
    label: string;
    @ApiProperty({ description: "设置项描述" })
    description: string;
    @ApiProperty({ description: "设置项分组" })
    group: string;
    @ApiProperty({ description: "设置项值" })
    value: string;
}
