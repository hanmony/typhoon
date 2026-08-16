import { ApiProperty } from "@nestjs/swagger";

export class TyphoonSevereWeatherNewColorDto {
    @ApiProperty({ description: "预警信息的颜色代码" })
    code: string = "";

    @ApiProperty({ description: "预警信息颜色的红色分量值（RGBA），范围 0–255" })
    red: Number = 0;

    @ApiProperty({ description: "预警颜色的绿色分量值（RGBA），范围 0–255" })
    green: Number = 0;

    @ApiProperty({ description: "预警颜色的蓝色分量值（RGBA），范围 0–255" })
    blue: Number = 0;

    @ApiProperty({ description: "预警颜色的透明度分量值（RGBA），范围 0-1" })
    alpha: Number = 0;
}
