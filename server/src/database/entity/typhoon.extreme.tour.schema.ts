import { Prop, Schema } from "@nestjs/mongoose";
import { Document } from "mongoose";

@Schema()
export class TyphoonPatrollingTourEntity {
    @Prop()
    commandId: string = "";
    @Prop()
    serialNumber: number = 0;
    @Prop()
    line: string = "";
    @Prop()
    identifiers: string[] = [];
    @Prop()
    startTime: Date = new Date();
    @Prop()
    endTime: Date = new Date();
    @Prop()
    speed: number = 0;
    @Prop()
    createTime: Date = new Date();
}

export type TyphoonPatrollingTourDocument = TyphoonPatrollingTourEntity &
    Document<unknown, unknown, TyphoonPatrollingTourEntity>;
