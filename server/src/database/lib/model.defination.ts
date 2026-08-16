import { Type } from "@nestjs/common";
import { InjectModel, SchemaFactory } from "@nestjs/mongoose";

export function InjectEntityModel<M>(modelType: Type<M>) {
    return InjectModel(modelType.name.replace("Entity", ""));
}

export function defineMongoFeature<M>(modelType: Type<M>, discriminators?: Type<M>[]) {
    const schema = SchemaFactory.createForClass(modelType);
    const dis = discriminators ? discriminators.map(i => defineMongoFeature(i)) : undefined;
    return {
        name: modelType.name.replace("Entity", ""),
        schema,
        discriminators: dis,
    };
}
