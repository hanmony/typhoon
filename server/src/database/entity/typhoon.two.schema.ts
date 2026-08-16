import { Prop, Schema } from "@nestjs/mongoose";
import { Document } from "mongoose";
import { TyphoonTwoForecastDto } from "src/typhoon/domain/typhoon.two.forecast.dto";
import { TyphoonTwoLandDto } from "src/typhoon/domain/typhoon.two.land.dto";
import { TyphoonTwoTrackDto } from "src/typhoon/domain/typhoon.two.track.dto";

@Schema()
export class TyphoonTwoEntity {
    @Prop({ unique: true })
    tfid: string;
    @Prop()
    name: string = "";
    @Prop()
    name_en: string = "";
    @Prop()
    is_active: string = "";
    @Prop()
    starttime: string = "";
    @Prop()
    endtime: string = "";
    @Prop()
    tracks: TyphoonTwoTrackDto[] = [];
    @Prop()
    forecasts: TyphoonTwoForecastDto[] = [];
    @Prop()
    lands: TyphoonTwoLandDto[] = [];
}

export type TyphoonTwoDocument = TyphoonTwoEntity & Document<unknown, unknown, TyphoonTwoEntity>;
