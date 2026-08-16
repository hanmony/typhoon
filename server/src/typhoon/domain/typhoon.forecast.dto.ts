import { ApiProperty } from "@nestjs/swagger";
import { TyphoonTrackWindRadiusDto } from "./typhoon.track.wind.radius.dto";

export class TyphoonForecastDto {
    @ApiProperty({ description: "台风预报时间" })
    fxTime: string = "";
    @ApiProperty({ description: "台风所处纬度" })
    lat: string = "";
    @ApiProperty({ description: "台风所处经度" })
    lon: string = "";
    @ApiProperty({ description: "台风类型" })
    type: string = "";
    @ApiProperty({ description: "台风中心气压" })
    pressure: string = "";
    @ApiProperty({ description: "台风附近最大风速" })
    windSpeed: string = "";
    @ApiProperty({ description: "台风移动速度" })
    moveSpeed: string = "";
    @ApiProperty({ description: "台风移动方位" })
    moveDir: string = "";
    @ApiProperty({ description: "台风移动方位360度方向" })
    move360: string = "";
}
