import { ApiProperty } from "@nestjs/swagger";
import { TyphoonNewDocument } from "src/database/entity/typhoon.new.schema";
import { TyphoonNowDto } from "./typhoon.now.dto";
import { TyphoonTrackDto } from "./typhoon.track.dto";
import { TyphoonForecastDto } from "./typhoon.forecast.dto";

export class TyphoonNewDto {
    @ApiProperty({ description: "id" })
    id: string;
    @ApiProperty({ description: "台风ID" })
    tfid: string;
    @ApiProperty({ description: "台风名称" })
    name: string = "";
    @ApiProperty({ description: "台风所处年份" })
    year: string = "";
    @ApiProperty({ description: "台风所处流域" })
    basin: string = "";
    @ApiProperty({ description: " 是否为活跃台风。1 活跃台风，0 停编" })
    isactive: string = "";
    @ApiProperty({ description: "台风实时路径" })
    now: TyphoonNowDto[] = [];
    @ApiProperty({ description: "台风路径" })
    track: TyphoonTrackDto[] = [];
    @ApiProperty({ description: "台风预报" })
    forecast: TyphoonForecastDto[] = [];
    static fromDoc(doc: TyphoonNewDocument): TyphoonNewDto {
        const ret = new TyphoonNewDto();
        ret.id = doc.id;
        ret.tfid = doc.tfid;
        ret.name = doc.name;
        ret.year = doc.year;
        ret.basin = doc.basin;
        ret.isactive = doc.isactive;
        return ret;
    }
}
