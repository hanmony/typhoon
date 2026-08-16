import { Injectable } from "@nestjs/common";
import { LogDo } from "../domain/do/log.do";
import { LogSearchDto } from "../domain/dto/log.search.dto";
import { LogListDto } from "../domain/dto/log.list.dto";
import { RepoService } from "src/database/service/repo/repo.service";

@Injectable()
export class LogService {
    constructor(private readonly repo: RepoService) {}

    async list(loginStaffId, filter: LogSearchDto): Promise<LogListDto> {
        const $and: any[] = [];
        if (filter.user) {
            $and.push({ user: { $regex: filter.user } });
        }
        if (filter.name) {
            $and.push({ name: { $regex: filter.name } });
        }
        if (filter.title) {
            $and.push({ title: { $regex: filter.title } });
        }
        if (filter.url) {
            $and.push({ url: { $regex: filter.url } });
        }
        if (filter.ip) {
            $and.push({ ip: { $regex: filter.ip } });
        }
        if (filter.useragent) {
            $and.push({ useragent: { $regex: filter.useragent } });
        }
        if (filter.request) {
            $and.push({ request: { $regex: filter.request } });
        }
        if (filter.response) {
            $and.push({ response: { $regex: filter.response } });
        }
        if (filter.period‌) {
            $and.push({
                createtime: {
                    $gte: new Date(filter.period‌[0]),
                    $lte: new Date(filter.period‌[1]),
                },
            });
        }
        const query: any = {};
        if ($and.length > 0) {
            query.$and = $and;
        }
        const list = await this.repo.userLogs
            .find(query)
            .sort({ createtime: -1 })
            .skip((filter.page - 1) * filter.pageSize)
            .limit(filter.pageSize)
            .exec();
        const ret = new LogListDto();
        ret.list = list.map(e => new LogDo(e).dto());
        ret.total = await this.repo.userLogs.countDocuments(query);
        return ret;
    }
}
