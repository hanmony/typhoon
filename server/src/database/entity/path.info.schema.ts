import { Prop, Schema } from "@nestjs/mongoose";
import { Document } from "mongoose";

/**
 * 台风路径
 */
@Schema()
export class PathInfoEntity {
    // 显示名字
    @Prop({ index: true, type: String })
    caseId: string;
    // 时间点
    @Prop({ type: Date })
    time: Date = new Date();
    // 经度
    @Prop()
    longitude: number = 0;
    // 纬度
    @Prop()
    latitude: number = 0;
    // 风力风速
    @Prop()
    power: string = "";
    // 中心气压
    @Prop()
    pressure: string = "";
    // 风圈半径
    @Prop()
    radius: string = "";
    // 登陆信息
    @Prop()
    landing: string = "";
}

export type PathInfoDocument = PathInfoEntity & Document<unknown, unknown, PathInfoEntity>;
