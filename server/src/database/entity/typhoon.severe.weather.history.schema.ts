import { Prop, Schema } from "@nestjs/mongoose";
import { Document } from "mongoose";

@Schema()
export class TyphoonSevereWeatherHistoryEntity {
    @Prop()
    commandId: string = "";
    @Prop()
    alertlevel: string = "";
    @Prop()
    alertlevels: string = "";
    @Prop()
    alertname: string = "";
    @Prop()
    alertnames: string = "";
    @Prop()
    defenseguideline: string = "";
    @Prop()
    forecaster: string = "";
    @Prop()
    info: string = "";
    @Prop()
    preupdatelevel: string = "";
    @Prop()
    publishtime: string = "";
    @Prop()
    publishtimes: string = "";
    @Prop()
    title: string = "";
    @Prop()
    warningstate: string = "";
    //自定义字段
    @Prop()
    isEnd: number = 0;
    @Prop()
    endtime: Date = new Date();
}

export type TyphoonSevereWeatherHistoryDocument = TyphoonSevereWeatherHistoryEntity &
    Document<unknown, unknown, TyphoonSevereWeatherHistoryEntity>;
