import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { Document } from "mongoose";

export type LlmModelRole = "default-large" | "default-small" | null;

@Schema({ timestamps: true })
export class LlmModelEntity {
    @Prop({ required: true })
    name: string;

    @Prop({ required: true })
    baseUrl: string;

    @Prop({ required: true })
    apiKey: string;

    @Prop({ required: true })
    model: string;

    @Prop({
        type: String,
        enum: ["default-large", "default-small", null],
        default: null,
    })
    role: LlmModelRole;
}

export const LlmModelSchema = SchemaFactory.createForClass(LlmModelEntity);
export type LlmModelDocument = LlmModelEntity & Document;
