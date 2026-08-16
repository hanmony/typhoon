import { readFileSync } from "fs";
import * as yaml from "js-yaml";
import { Model } from "mongoose";
import { SettingEntity } from "src/database/entity/settings.schema";

export async function initSettings(model: Model<SettingEntity>) {
    const txt = readFileSync(`./config/init-datas/settings.yml`, "utf8");
    const raw = yaml.load(txt) as Iterable<Record<string, any>>;

    const settings: SettingEntity[] = [];

    for (const group of raw) {
        const elements = group.items;
        for (const item of elements) {
            const name = item.name;
            const exists = await model.exists({ name }).exec();
            if (exists) {
                continue;
            }
            const setting = new model();
            settings.push(setting);
            setting.name = name;
            setting.group = group.group;
            setting.label = item.label;
            setting.description = item.description;
            setting.value = item.value;
        }
    }

    if (settings.length > 0) {
        await model.insertMany(settings);
    }
}
