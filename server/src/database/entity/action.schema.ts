import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { ApiProperty } from "@nestjs/swagger";
import { Document, ObjectId, Types } from "mongoose";
import { ActionCategory } from "../lib/action.category";

@Schema({ _id: false, timestamps: true })
export class ActionAccessoryEntity {
    @ApiProperty({ description: "文件名" })
    @Prop()
    filename: string;

    @ApiProperty({ description: "原始文件名" })
    @Prop()
    originName: string;

    @ApiProperty({ description: "文件类型" })
    @Prop()
    contentType: string;

    @ApiProperty({ description: "文件上传日期" })
    createdAt: Date = new Date();
}

const ActionAccessorySchema = SchemaFactory.createForClass(ActionAccessoryEntity);

@Schema()
export class ActionEntity {
    // 案例ID
    @Prop({ index: true, type: Types.ObjectId })
    caseId: ObjectId;
    // 案例名称
    @Prop({ index: true, type: String })
    caseName: string = "";
    // 行为种类
    @Prop({ index: true, type: String })
    category: ActionCategory = ActionCategory.unknown;
    // 开始时间
    @Prop({ type: Date })
    fromDate = new Date();
    // 结束时间，如果大于3000年，表示无结束时间
    @Prop({ type: Date })
    toDate = new Date();
    // 行为数据
    @Prop({ type: Types.Map, of: String })
    items: Map<string, string> = new Map<string, string>();
    // 附件
    @Prop({ type: [ActionAccessorySchema] })
    accessories: ActionAccessoryEntity[] = [];
}

export type ActionDocument = ActionEntity & Document<unknown, unknown, ActionEntity>;
