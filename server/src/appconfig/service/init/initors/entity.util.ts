import { readFileSync } from "fs";
import * as yaml from "js-yaml";
import { EntityManager, ObjectLiteral } from "typeorm";

export function getEntitiesFromYml<T extends ObjectLiteral>(entityClass: new () => T, path: string): T[] {
    const txt = readFileSync(`./config/init-datas/${path}.yml`, "utf8");
    const raw = yaml.load(txt) as Record<string, any>;
    const entities = raw.map(item => {
        const entity = new entityClass();
        Object.assign(entity, item);
        return entity;
    });
    return entities;
}

export async function insertEntitiesIfNone<T extends ObjectLiteral>(
    entityClass: new () => T,
    man: EntityManager,
    entities: T[],
) {
    const count = await man.count(entityClass);
    if (count > 0) {
        return;
    }
    await man.createQueryBuilder().insert().into(entityClass).values(entities).execute();
}
