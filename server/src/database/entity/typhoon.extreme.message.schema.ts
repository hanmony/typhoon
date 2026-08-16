import { Prop, Schema } from "@nestjs/mongoose";
import { Document } from "mongoose";

@Schema()
export class TyphoonExtremeMessageEntity {
    @Prop()
    commandId: string = "";
    @Prop()
    title: string = "";
    @Prop()
    content: string = "";
    @Prop()
    createTime: Date = new Date();
    @Prop()
    updateTime: Date = new Date();
    @Prop()
    type: string = "";
    @Prop()
    lines: string[] = [];
    @Prop()
    eventIds: string[] = [];
    @Prop()
    readUserIds: string[] = [];
}

export type TyphoonExtremeMessageDocument = TyphoonExtremeMessageEntity &
    Document<unknown, unknown, TyphoonExtremeMessageEntity>;
