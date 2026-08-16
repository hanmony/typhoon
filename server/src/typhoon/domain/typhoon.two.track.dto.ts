import { ApiProperty } from "@nestjs/swagger";
import { TyphoonTrackWindRadiusDto } from "./typhoon.track.wind.radius.dto";

export class TyphoonTwoTrackDto {
    @ApiProperty({ description: "台风中心所在纬度" })
    lat: string = "";
    @ApiProperty({ description: "台风中心所在经度" })
    lon: string = "";
    @ApiProperty({ description: "台风中心最大风级" })
    wind_class: string = "";
    @ApiProperty({ description: "台风中心附近最大风速，单位：m/s，米/秒" })
    wind_speed: string = "";
    @ApiProperty({ description: "台风强度等级" })
    level: string = "";
    @ApiProperty({ description: "中心最低气压，单位：hPa，百帕" })
    pressure: string = "";
    @ApiProperty({ description: "移动方向" })
    move_dir: string = "";
    @ApiProperty({ description: "移动速度，单位：km/h，公里/小时" })
    move_sp: string = "";
    @ApiProperty({ description: "7级风圈半径，单位：km，公里" })
    radius7: TyphoonTrackWindRadiusDto = new TyphoonTrackWindRadiusDto();
    @ApiProperty({ description: "10级风圈半径，单位：km，公里" })
    radius10: TyphoonTrackWindRadiusDto = new TyphoonTrackWindRadiusDto();
    @ApiProperty({ description: "12级风圈半径，单位：km，公里" })
    radius12: TyphoonTrackWindRadiusDto = new TyphoonTrackWindRadiusDto();
    @ApiProperty({ description: "参考位置" })
    ck_position: string = "";
    @ApiProperty({ description: "未来趋势，原jl字段" })
    trend: string = "";
    @ApiProperty({ description: "数据时间" })
    data_time: string = "";
}
