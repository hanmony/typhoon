import { UserLogDocument } from "src/database/entity/user.log.schema";
import { LogDto } from "../dto/log.dto";

export class LogDo {
    constructor(public readonly entity: UserLogDocument) {}

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

    dto(): LogDto {
        const ret = new LogDto();
        ret.id = this.id;
        ret.user = this.entity.user;
        ret.name = this.entity.name;
        ret.dept = this.entity.dept;
        ret.job = this.entity.job;
        ret.url = this.entity.url;
        ret.title = this.entity.title;
        ret.module = this.entity.module;
        ret.ip = this.entity.ip;
        ret.useragent = this.entity.useragent;
        ret.request = this.entity.request;
        ret.response = this.entity.response;
        ret.createtime = this.entity.createtime;
        return ret;
    }
}
