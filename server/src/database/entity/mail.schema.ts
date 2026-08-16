import { Prop, Schema } from "@nestjs/mongoose";
import { Document } from "mongoose";

@Schema()
export class MailEntity {
    @Prop()
    title: string = "";
    @Prop()
    content: string = "";
    @Prop()
    sender: string = "";
    @Prop()
    receiver: string = "";
    @Prop()
    createTime: string = "";
    @Prop()
    readTime: Date = new Date();
    @Prop()
    isRead: number = 0;
    @Prop()
    type: string = "";
    @Prop()
    subType: string = "";
    @Prop()
    typhoonLines: string[] = [];
    @Prop()
    typhoonEvents: number[] = [];
}

export type MailDocument = MailEntity & Document<unknown, unknown, MailEntity>;
