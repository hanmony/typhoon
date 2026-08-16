import { Prop, Schema } from "@nestjs/mongoose";
import { Document } from "mongoose";
import { TyphoonSevereWeatherNewColorDto } from "src/typhoon/domain/typhoon.severe.weather.new.color.dto";
import { TyphoonSevereWeatherNewEventTypeDto } from "src/typhoon/domain/typhoon.severe.weather.new.event.type.dto";
import { TyphoonSevereWeatherNewMessageTypeDto } from "src/typhoon/domain/typhoon.severe.weather.new.message.type.dto";

@Schema()
export class TyphoonSevereWeatherNewHistoryEntity {
    @Prop()
    commandId: string = "";

    // 预警唯一标识
    @Prop()
    weatherId: string = "";

    // 预警发布机构名称
    @Prop()
    senderName: string = "";

    // 原始预警信息生成时间
    @Prop()
    issuedTime: Date = new Date();

    @Prop()
    messageType: TyphoonSevereWeatherNewMessageTypeDto = new TyphoonSevereWeatherNewMessageTypeDto();

    // // 预警信息性质代码 (new/update/cancel)
    // @Prop()
    // messageTypeCode: string = "";

    // // 当前预警取代或取消的预警ID列表
    // @Prop({ type: [String], default: [] })
    // messageTypeSupersedes: string[] = [];

    @Prop()
    eventType: TyphoonSevereWeatherNewEventTypeDto = new TyphoonSevereWeatherNewEventTypeDto();

    // // 预警事件类型名称
    // @Prop()
    // eventTypeName: string = "";

    // // 预警事件类型代码
    // @Prop()
    // eventTypeCode: string = "";

    // 预警紧迫程度
    @Prop()
    urgency: string = "";

    // 预警严重程度
    @Prop()
    severity: string = "";

    // 预警确定性
    @Prop()
    certainty: string = "";

    // 预警图标代码
    @Prop()
    icon: string = "";

    @Prop()
    color: TyphoonSevereWeatherNewColorDto = new TyphoonSevereWeatherNewColorDto();

    // 预警生效时间
    @Prop()
    effectiveTime: Date = new Date();

    // 预警事件预计开始时间
    @Prop()
    onsetTime: Date = new Date();

    // 预警失效时间
    @Prop()
    expireTime: Date = new Date();

    // 预警简要描述/标题
    @Prop()
    headline: string = "";

    // 预警详细描述
    @Prop()
    description: string = "";

    // 预警触发标准/条件
    @Prop()
    criteria: string = "";

    // 防御指南/行动指导
    @Prop()
    instruction: string = "";

    // 应对方式类型代码列表
    @Prop({ type: [String], default: [] })
    responseTypes: string[] = [];
    
    //自定义字段
    @Prop()
    isEnd: number = 0;
    @Prop()
    endtime: Date = new Date();
}

export type TyphoonSevereWeatherNewHistoryDocument = TyphoonSevereWeatherNewHistoryEntity &
    Document<unknown, unknown, TyphoonSevereWeatherNewHistoryEntity>;
