import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { ApiProperty } from "@nestjs/swagger";
import { Document } from "mongoose";
import { ExcelColumn, excelArrayParserReg } from "src/common/service/excel/excel.file";

export enum CaseStatus {
    deleted = -1, // 删除
    normal = 0, // 正常
    approving = 1, // 待发布
    editing = 2, // 编辑中
}

@Schema({ _id: false })
export class CaseConfigItem {
    @ExcelColumn("类型")
    @ApiProperty({ description: "配置项名称" })
    @Prop({ type: String })
    key: string = "";
    @ExcelColumn("分类")
    @ApiProperty({ description: "配置项类别" })
    @Prop({ type: String })
    type: string = "";

    @ExcelColumn("值")
    @ApiProperty({ description: "配置项值" })
    @Prop({ type: String })
    value: string = "";

    @ExcelColumn("配置类型")
    @ApiProperty({ description: "配置编辑类型" })
    @Prop({ type: String })
    editorType: string = "";

    @ExcelColumn("可写内容", excelArrayParserReg())
    @ApiProperty({ description: "配置编辑选项" })
    @Prop({ type: [String] })
    editorOptions: string[] = [];
}

export const CaseConfigItemSchema = SchemaFactory.createForClass(CaseConfigItem);

@Schema({ timestamps: true })
export class CaseEntity {
    @ApiProperty({ description: "案例ID" })
    _id: string = "";

    // 显示名字
    @ApiProperty({ description: "案例名称" })
    @Prop({ index: true, type: String })
    name: string;

    @ApiProperty({ description: "台风案例配置值", type: typeof Map<string, CaseConfigItem> })
    @Prop({ type: Map, of: CaseConfigItemSchema })
    values = new Map<string, CaseConfigItem>();

    // 状态, 0: 正常, 1: 下架, 2: 编辑中, -1: 删除
    @ApiProperty({ description: "状态", enum: CaseStatus })
    @Prop({ type: Number })
    status = CaseStatus.normal;

    @ApiProperty({ description: "创建时间" })
    createdAt: Date;
    @ApiProperty({ description: "更新时间" })
    updatedAt: Date;
}

export type CaseDocument = CaseEntity & Document<unknown, unknown, CaseEntity>;
