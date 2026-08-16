import { Prop, Schema } from "@nestjs/mongoose";

@Schema()
export class SettingEntity {
    @Prop({ index: true, unique: true })
    name: string;
    @Prop()
    label: string;
    @Prop()
    group: string;
    @Prop()
    description: string;
    @Prop()
    value: string;
}
