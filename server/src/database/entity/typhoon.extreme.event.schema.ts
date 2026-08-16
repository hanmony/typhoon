import { Prop, Schema } from "@nestjs/mongoose";
import { Document } from "mongoose";

@Schema()
export class TyphoonExtremeEventEntity {
    @Prop()
    commandId: string = "";
    @Prop()
    customPosition: string = "";
    @Prop()
    description: string = "";
    @Prop()
    direction: string = "";
    @Prop()
    startStation: string = "";
    @Prop()
    endStation: string = "";
    @Prop()
    eventType: string = "";
    @Prop()
    images: string[] = [];
    @Prop()
    locationType: string = "";
    @Prop()
    otherEvent: string = "";
    @Prop()
    severity: number = 0;
    @Prop()
    line: string = "";
    @Prop()
    urgentRepair: number = 0;
    @Prop()
    urgentRepairStatus: number = 0;
    @Prop()
    startTime: Date = new Date();
    @Prop()
    endTime: Date = new Date();
    @Prop()
    createTime: Date = new Date();
    @Prop()
    updateTime: Date = new Date();
    @Prop()
    isShow: number = 1;
    @Prop()
    terminated: number = 0;
    @Prop()
    effect: number = 0;
    @Prop()
    effectDuration: number = 0;
    @Prop()
    trainNumber: string = "";
    @Prop()
    source: string = "";
    @Prop()
    repairUnits: string[] = [];
    @Prop()
    responsiblePerson: string = "";
    @Prop()
    contactPhone: string = "";
    @Prop()
    supervision: boolean = false;
    @Prop()
    associatedPoint: string = "";
}

export type TyphoonExtremeEventDocument = TyphoonExtremeEventEntity &
    Document<unknown, unknown, TyphoonExtremeEventEntity>;
