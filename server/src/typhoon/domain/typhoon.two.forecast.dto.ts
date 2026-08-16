import { ApiProperty } from "@nestjs/swagger";

export class TyphoonTwoForecastDto {
    @ApiProperty({ description: "台风中心所在纬度" })
    lat: string = "";
    @ApiProperty({ description: "台风中心所在经度" })
    lon: string = "";
    @ApiProperty({ description: "台风中心最大风级" })
    wind_class: string = "";
    @ApiProperty({ description: "台风附近最大风速" })
    wind_speed: string = "";
    @ApiProperty({ description: "台风强度等级" })
    level: string = "";
    @ApiProperty({ description: "中心最低气压，单位：hPa，百帕" })
    pressure: string = "";
    @ApiProperty({ description: "数据时间" })
    data_time: string = "";
}
