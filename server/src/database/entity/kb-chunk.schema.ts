import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { Document } from "mongoose";

@Schema({ timestamps: true })
export class KbChunkEntity {
    @Prop({ required: true })
    documentId: string;

    @Prop({ type: Number, required: true })
    chunkIndex: number;

    @Prop({ required: true })
    content: string;

    @Prop()
    qdrantPointId: string;
}

export const KbChunkSchema = SchemaFactory.createForClass(KbChunkEntity);
export type KbChunkDocument = KbChunkEntity & Document;
