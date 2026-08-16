import { ApiProperty } from "@nestjs/swagger";
import { TyphoonTwoDocument } from "src/database/entity/typhoon.two.schema";
import { TyphoonTwoTrackDto } from "./typhoon.two.track.dto";
import { TyphoonTwoForecastDto } from "./typhoon.two.forecast.dto";
import { TyphoonTwoLandDto } from "./typhoon.two.land.dto";

export class TyphoonTwoDto {
    @ApiProperty({ description: "id" })
    id: string;
    @ApiProperty({ description: "台风ID" })
    tfid: string;
    @ApiProperty({ description: "台风名称" })
    name: string = "";
    @ApiProperty({ description: "台风名称英文" })
    name_en: string = "";
    @ApiProperty({ description: " 是否为活跃台风。1 活跃台风，0 停编" })
    is_active: string = "";
    @ApiProperty({ description: "starttime" })
    starttime: string = "";
    @ApiProperty({ description: "endtime" })
    endtime: string = "";
    @ApiProperty({ description: "台风路径" })
    tracks: TyphoonTwoTrackDto[] = [];
    @ApiProperty({ description: "台风预报" })
    forecasts: TyphoonTwoForecastDto[] = [];
    @ApiProperty({ description: "台风登陆" })
    lands: TyphoonTwoLandDto[] = [];
    static fromDoc(doc: TyphoonTwoDocument): TyphoonTwoDto {
        const ret = new TyphoonTwoDto();
        ret.id = doc.id;
        ret.tfid = doc.tfid;
        ret.name = doc.name;
        ret.name_en = doc.name_en;
        ret.is_active = doc.is_active;
        ret.starttime = doc.starttime;
        ret.endtime = doc.endtime;
        ret.tracks = doc.tracks;
        ret.forecasts = doc.tracks;
        ret.lands = doc.lands;
        return ret;
    }
}
