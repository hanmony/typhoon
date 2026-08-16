import { Prop, Schema } from "@nestjs/mongoose";
import { Document } from "mongoose";

@Schema()
export class TyphoonCommandEntity {
    @Prop()
    name: string = "";
    @Prop()
    startTime: Date = new Date();
    @Prop()
    endTime: Date = new Date();
    @Prop()
    status: number = 0;
    @Prop()
    isSimulated: number = 0;
    @Prop()
    passTime: Date = new Date();
    @Prop()
    isPass: number = 0;

    /** 模拟开始时间 */
    @Prop()
    simulateStartTime?: Date = new Date();
    /** 市级应急等级 */
    @Prop()
    municipalDegree: string = "";
    /** 市级应急开关 */
    @Prop()
    municipalFlag: number = 0;
    /** 集团级应急等级 */
    @Prop()
    corporateDegree: string = "";
    /** 集团级应急开关 */
    @Prop()
    corporateFlag: number = 0;
}

export type TyphoonCommandDocument = TyphoonCommandEntity & Document<unknown, unknown, TyphoonCommandEntity>;
