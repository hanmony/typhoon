import { DigitalPlanDocument } from "src/database/entity/digital.plan.schema";
import { DigitalPlanDto } from "../dto/digital.plan.dto";

export class DigitalPlanDo {
    constructor(public readonly entity: DigitalPlanDocument) {}

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

    dto(): DigitalPlanDto {
        const ret = new DigitalPlanDto();
        ret.id = this.id;
        ret.name = this.entity.name;
        ret.url = this.entity.url;
        ret.status = this.entity.status;
        ret.createdAt = this.entity.createdAt;
        ret.updatedAt = this.entity.updatedAt;
        return ret;
    }
}
