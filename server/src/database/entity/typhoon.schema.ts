import { Prop, Schema } from "@nestjs/mongoose";
import { Document } from "mongoose";
import { TyphoonLandDto } from "src/typhoon/domain/typhoon.land.dto";
import { TyphoonPointDto } from "src/typhoon/domain/typhoon.point.dto";

@Schema()
export class TyphoonEntity {
    @Prop({ unique: true })
    tfid: string;
    @Prop()
    name: string = "";
    @Prop()
    enname: string = "";
    @Prop()
    isactive: string = "";
    @Prop()
    warnlevel: string = "";
    @Prop()
    starttime: string = "";
    @Prop()
    endtime: string = "";
    @Prop()
    centerlat: string = "";
    @Prop()
    centerlng: string = "";
    @Prop()
    land: TyphoonLandDto[] = [];
    @Prop()
    points: TyphoonPointDto[] = [];
}

export type TyphoonDocument = TyphoonEntity & Document<unknown, unknown, TyphoonEntity>;
