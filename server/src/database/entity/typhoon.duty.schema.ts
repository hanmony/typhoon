import { Prop, Schema } from "@nestjs/mongoose";
import { Document } from "mongoose";

@Schema()
export class TyphoonDutyEntity {
    @Prop()
    commandId: string = "";
    /** 值班日期 YYYY-MM-DD */
    @Prop()
    date: string = "";
    @Prop()
    department: string = "";
    @Prop()
    responsible: string = "";
}

export type TyphoonDutyDocument = TyphoonDutyEntity & Document<unknown, unknown, TyphoonDutyEntity>;
