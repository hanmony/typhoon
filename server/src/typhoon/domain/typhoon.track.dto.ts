import { ApiProperty } from "@nestjs/swagger";
import { TyphoonTrackWindRadiusDto } from "./typhoon.track.wind.radius.dto";

export class TyphoonTrackDto {
    @ApiProperty({ description: "当前台风信息发布时间" })
    time: string = "";
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
    @ApiProperty({ description: "台风7级风圈" })
    windRadius30: TyphoonTrackWindRadiusDto = new TyphoonTrackWindRadiusDto();
    @ApiProperty({ description: "台风10级风圈" })
    windRadius50: TyphoonTrackWindRadiusDto = new TyphoonTrackWindRadiusDto();
    @ApiProperty({ description: "台风12级风圈" })
    windRadius64: TyphoonTrackWindRadiusDto = new TyphoonTrackWindRadiusDto();
}
