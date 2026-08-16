import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { Document } from "mongoose";

export type KbCategory = "typhoon_case" | "regulation" | "emergency_plan" | "other";

@Schema({ timestamps: true })
export class KbDocumentEntity {
    @Prop({ required: true, index: true })
    name: string;

    @Prop({ required: true })
    fileType: string;

    @Prop({ required: true })
    filePath: string;

    @Prop({ type: Number })
    fileSize: number;

    @Prop({ type: Number, default: 0 })
    status: number; // 0=pending, 1=parsing, 2=chunked, 3=indexed, -1=error

    @Prop()
    statusMessage: string;

    @Prop({ type: Number })
    chunkCount: number;

    @Prop({ type: String, default: "other", enum: ["typhoon_case", "regulation", "emergency_plan", "other"] })
    category: KbCategory;

    @Prop({ type: Object })
    chunkConfig: {
        strategy: string;
        chunkSize: number;
        overlap: number;
    };

    @Prop({ type: [String], default: [] })
    autoTags: string[];

    @Prop({ type: [String], default: [] })
    manualTags: string[];

    @Prop()
    summary: string;
}

export const KbDocumentSchema = SchemaFactory.createForClass(KbDocumentEntity);
export type KbDocumentDocument = KbDocumentEntity & Document;
