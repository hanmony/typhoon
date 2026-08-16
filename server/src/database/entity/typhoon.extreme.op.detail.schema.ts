import { Prop, Schema } from "@nestjs/mongoose";
import { Document } from "mongoose";

@Schema()
export class TyphoonExtremeOpDetailEntity {
    @Prop()
    commandId: string = "";
    @Prop()
    line: string = "";
    @Prop()
    detail: string = "";
    @Prop()
    isObstructing: number = 0;
    @Prop()
    createTime: Date = new Date();
    @Prop()
    updateTime: Date = new Date();
}

export type TyphoonExtremeOpDetailDocument = TyphoonExtremeOpDetailEntity &
    Document<unknown, unknown, TyphoonExtremeOpDetailEntity>;
