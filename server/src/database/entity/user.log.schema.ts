import { Prop, Schema } from "@nestjs/mongoose";
import { Document } from "mongoose";

@Schema()
export class UserLogEntity {
    @Prop()
    user: string;
    @Prop()
    name: string;
    @Prop()
    dept: string;
    @Prop()
    job: string;
    @Prop()
    url: string;
    @Prop()
    module: string;
    @Prop()
    title: string;
    @Prop()
    ip: string;
    @Prop()
    useragent: string;
    @Prop()
    request: string;
    @Prop()
    response: string;
    @Prop({ type: Date })
    createtime: Date = new Date();
}

// DepartmentDoc
export type UserLogDocument = Document<unknown, unknown, UserLogEntity> & UserLogEntity;
