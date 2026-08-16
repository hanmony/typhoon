import { ApiProperty } from "@nestjs/swagger";
import { TyphoonSevereWeatherDto } from "./typhoon.severe.weather.dto";
import { TyphoonSevereWeatherHistoryDocument } from "src/database/entity/typhoon.severe.weather.history.schema";

export class TyphoonSevereWeatherHistoryDto extends TyphoonSevereWeatherDto {
    // @ApiProperty({ description: "alertlevel" })
    // alertlevel: string = "";
    // @ApiProperty({ description: "alertlevels" })
    // alertlevels: string = "";
    // @ApiProperty({ description: "alertname" })
    // alertname: string = "";
    // @ApiProperty({ description: "alertnames" })
    // alertnames: string = "";
    // @ApiProperty({ description: "defenseguideline" })
    // defenseguideline: string = "";
    // @ApiProperty({ description: "forecaster" })
    // forecaster: string = "";
    // @ApiProperty({ description: "info" })
    // info: string = "";
    // @ApiProperty({ description: "preupdatelevel" })
    // preupdatelevel: string = "";
    // @ApiProperty({ description: "publishtime" })
    // publishtime: string = "";
    // @ApiProperty({ description: "publishtimes" })
    // publishtimes: string = "";
    // @ApiProperty({ description: "title" })
    // title: string = "";
    // @ApiProperty({ description: "warningstate" })
    // warningstate: string = "";
    @ApiProperty({ description: "预警是否结束" })
    isEnd: number = 0;
    @ApiProperty({ description: "预警结束时间" })
    endtime: Date = new Date();

    static fromHistoryDoc(doc: TyphoonSevereWeatherHistoryDocument): TyphoonSevereWeatherHistoryDto {
        const ret = new TyphoonSevereWeatherHistoryDto();
        ret.alertlevel = doc.alertlevel;
        ret.alertlevels = doc.alertlevels;
        ret.alertname = doc.alertname;
        ret.alertnames = doc.alertnames;
        ret.defenseguideline = doc.defenseguideline;
        ret.forecaster = doc.forecaster;
        ret.info = doc.info;
        ret.preupdatelevel = doc.preupdatelevel;
        ret.publishtime = doc.publishtime;
        ret.publishtimes = doc.publishtimes;
        ret.title = doc.title;
        ret.warningstate = doc.warningstate;
        ret.isEnd = doc.isEnd;
        ret.endtime = doc.endtime;
        return ret;
    }
}
