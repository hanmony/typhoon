import { ApiProperty } from "@nestjs/swagger";
import { TyphoonSevereWeatherNewMessageTypeDto } from "./typhoon.severe.weather.new.message.type.dto";
import { TyphoonSevereWeatherNewEventTypeDto } from "./typhoon.severe.weather.new.event.type.dto";
import { TyphoonSevereWeatherNewColorDto } from "./typhoon.severe.weather.new.color.dto";

export class TyphoonSevereWeatherNewDto {

    @ApiProperty({ description: "指挥ID" })
    commandId: string = "";

    @ApiProperty({ description: "预警唯一标识" })
    weatherId: string = "";

    @ApiProperty({ description: "预警发布机构名称", required: false })
    senderName: string = "";

    @ApiProperty({ description: "原始预警信息生成时间" })
    issuedTime: Date = new Date();

    @ApiProperty({ description: "预警信息性质代码 (new/update/cancel)" })
    messageType: TyphoonSevereWeatherNewMessageTypeDto = new TyphoonSevereWeatherNewMessageTypeDto();
    
    @ApiProperty({ description: "预警事件类型" })
    eventType: TyphoonSevereWeatherNewEventTypeDto = new TyphoonSevereWeatherNewEventTypeDto();

    @ApiProperty({ description: "预警紧迫程度", required: false })
    urgency: string = "";

    @ApiProperty({ description: "预警严重程度", enum: ["minor", "moderate", "severe", "extreme"] })
    severity: string = "";

    @ApiProperty({ description: "预警确定性", required: false })
    certainty: string = "";

    @ApiProperty({ description: "预警图标代码" })
    icon: string = "";

    @ApiProperty({ description: "预警颜色"})
    color: TyphoonSevereWeatherNewColorDto = new TyphoonSevereWeatherNewColorDto();

    @ApiProperty({ description: "预警生效时间", required: false })
    effectiveTime: Date = new Date();

    @ApiProperty({ description: "预警事件预计开始时间", required: false })
    onsetTime: Date = new Date();

    @ApiProperty({ description: "预警失效时间" })
    expireTime: Date = new Date();

    @ApiProperty({ description: "预警简要描述/标题" })
    headline: string = "";

    @ApiProperty({ description: "预警详细描述" })
    description: string = "";

    @ApiProperty({ description: "预警触发标准/条件", required: false })
    criteria: string = "";

    @ApiProperty({ description: "防御指南/行动指导", required: false })
    instruction: string = "";

    @ApiProperty({ description: "应对方式类型代码列表", type: [String], required: false })
    responseTypes: string[] = [];

    // ===== 与老版 AlertService 兼容字段（ai 端 alert.service.ts 仍依赖） =====
    @ApiProperty({ description: "预警名称（兼容老版）", required: false })
    alertname?: string = "";

    @ApiProperty({ description: "预警等级（兼容老版）", required: false })
    alertlevel?: string = "";

    @ApiProperty({ description: "预警状态（兼容老版）", required: false })
    warningstate?: string = "";

    @ApiProperty({ description: "预警标题（兼容老版）", required: false })
    title?: string = "";

    @ApiProperty({ description: "预警发布时间（兼容老版）", required: false })
    publishtime?: string = "";

    @ApiProperty({ description: "防御指南（兼容老版）", required: false })
    defenseguideline?: string = "";
}
