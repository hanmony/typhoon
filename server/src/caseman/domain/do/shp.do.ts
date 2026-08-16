import { ShpDocument } from "src/database/entity/shp.schema";
import { ShpDto } from "../dto/shp.dto";

export class ShpDo {
    constructor(public readonly entity: ShpDocument) {}

    public get id(): string {
        return this.entity._id.toString();
    }

    public async save() {
        if (this.entity.isNew) {
            await this.entity.save();
        } else {
            await this.entity.updateOne(this.entity);
        }
    }

    dto(): ShpDto {
        const ret = new ShpDto();
        ret.id = this.id;
        ret.name = this.entity.name;
        ret.url = this.entity.url;
        ret.status = this.entity.status;
        ret.createdAt = this.entity.createdAt;
        ret.updatedAt = this.entity.updatedAt;
        return ret;
    }
}
