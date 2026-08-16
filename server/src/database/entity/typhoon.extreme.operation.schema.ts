import { Prop, Schema } from "@nestjs/mongoose";
import { Document } from "mongoose";

@Schema()
export class TyphoonExtremeOperationEntity {
    @Prop()
    commandId: string = "";
    @Prop()
    actionType: string = "";
    @Prop()
    close: number = 0;
    @Prop()
    customPosition: string = "";
    @Prop()
    description: string = "";
    @Prop()
    direction: string = "";
    @Prop()
    distance: number = 0;
    @Prop()
    startStation: string = "";
    @Prop()
    endStation: string = "";
    @Prop()
    startTime: Date = new Date();
    @Prop()
    endTime: Date = new Date();
    @Prop()
    limit: number = 0;
    @Prop()
    line: string = "";
    @Prop()
    locationType: string = "";
    @Prop()
    time: Date[] = [];
    @Prop()
    createTime: Date = new Date();
    @Prop()
    updateTime: Date = new Date();
    @Prop()
    isShow: number = 1;
    @Prop()
    source: string = "";
    /** 运营真实恢复时间 */
    @Prop()
    actualEndTime: Date = new Date();
    /** 计划恢复时间未定 */
    @Prop()
    isEndTimeOptional: boolean = false;
}

export type TyphoonExtremeOperationDocument = TyphoonExtremeOperationEntity &
    Document<unknown, unknown, TyphoonExtremeOperationEntity>;
