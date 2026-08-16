import { Prop, Schema } from "@nestjs/mongoose";
import { Document } from "mongoose";
import { TyphoonForecastDto } from "src/typhoon/domain/typhoon.forecast.dto";
import { TyphoonNowDto } from "src/typhoon/domain/typhoon.now.dto";
import { TyphoonTrackDto } from "src/typhoon/domain/typhoon.track.dto";

@Schema()
export class TyphoonNewEntity {
    @Prop({ unique: true })
    tfid: string;
    @Prop()
    name: string = "";
    @Prop()
    basin: string = "";
    @Prop()
    year: string = "";
    @Prop()
    isactive: string = "";
    @Prop()
    now: TyphoonNowDto[] = [];
    @Prop()
    track: TyphoonTrackDto[] = [];
    @Prop()
    forecast: TyphoonForecastDto[] = [];
}

export type TyphoonNewDocument = TyphoonNewEntity & Document<unknown, unknown, TyphoonNewEntity>;
