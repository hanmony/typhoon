import { ApiProperty } from "@nestjs/swagger";
import { TyphoonLandDto } from "./typhoon.land.dto";
import { TyphoonPointDto } from "./typhoon.point.dto";
import { TyphoonDocument } from "src/database/entity/typhoon.schema";

export class TyphoonDto {
    @ApiProperty({ description: "id" })
    id: string;
    @ApiProperty({ description: "tfid" })
    tfid: string;
    @ApiProperty({ description: "name" })
    name: string = "";
    @ApiProperty({ description: "enname" })
    enname: string = "";
    @ApiProperty({ description: "isactive" })
    isactive: string = "";
    @ApiProperty({ description: "warnlevel" })
    warnlevel: string = "";
    @ApiProperty({ description: "starttime" })
    starttime: string = "";
    @ApiProperty({ description: "endtime" })
    endtime: string = "";
    @ApiProperty({ description: "centerlat" })
    centerlat: string = "";
    @ApiProperty({ description: "centerlng" })
    centerlng: string = "";
    @ApiProperty({ description: "land" })
    land: TyphoonLandDto[] = [];
    @ApiProperty({ description: "points" })
    points: TyphoonPointDto[] = [];
    static fromDoc(doc: TyphoonDocument): TyphoonDto {
        const ret = new TyphoonDto();
        ret.id = doc.id;
        ret.tfid = doc.tfid;
        ret.name = doc.name;
        ret.enname = doc.enname;
        ret.isactive = doc.isactive;
        ret.warnlevel = doc.warnlevel;
        ret.starttime = doc.starttime;
        ret.endtime = doc.endtime;
        ret.centerlat = doc.centerlat;
        ret.centerlng = doc.centerlng;
        ret.land = doc.land;
        ret.points = doc.points;
        return ret;
    }
}
