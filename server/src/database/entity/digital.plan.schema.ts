import { Prop, Schema } from "@nestjs/mongoose";
import { ApiProperty } from "@nestjs/swagger";
import { Document } from "mongoose";

@Schema()
export class DigitalPlanEntity {
    // 文件名
    @Prop()
    name: string;
    // 密码
    @Prop()
    url: string;
    // 状态, 0: 正常, 1: 下架, 2: 编辑中, -1: 删除
    @ApiProperty({ description: "状态" })
    @Prop({ type: Number })
    status = 0;

    @ApiProperty({ description: "预案更新时间" })
    @Prop()
    updateTime: Date = new Date();

    @ApiProperty({ description: "创建时间" })
    @Prop()
    createdAt: Date = new Date();

    @ApiProperty({ description: "更新时间" })
    @Prop()
    updatedAt: Date = new Date();
}

export type DigitalPlanDocument = DigitalPlanEntity & Document<unknown, unknown, DigitalPlanEntity>;
