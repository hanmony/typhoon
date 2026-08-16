import { Injectable } from "@nestjs/common";
import { join } from "path";
import { RepoService } from "src/database/service/repo/repo.service";
import { DigitalPlanSearchDto } from "src/caseman/domain/dto/digital.plan.search.dto";
import { DigitalPlanListDto } from "src/caseman/domain/dto/digital.plan.list.dto";
import { DigitalPlanDo } from "src/caseman/domain/do/digital.plan.do";
import { DigitalPlanDto } from "src/caseman/domain/dto/digital.plan.dto";
import { Failed } from "src/diagnostics/lib/failed";

@Injectable()
export class DigitalPlanService {
    constructor(private readonly repo: RepoService) {}
    async list(loginStaffId, filter: DigitalPlanSearchDto): Promise<DigitalPlanListDto> {
        const $and: any[] = [];

        $and.push({ status: { $gte: 0 } });

        if (filter.name) {
            $and.push({ name: { $regex: filter.name } });
        }
        if (filter.url) {
            $and.push({ url: { $regex: filter.url } });
        }
        if (filter.period‌) {
            $and.push({
                createdAt: {
                    $gte: new Date(filter.period‌[0]),
                    $lte: new Date(filter.period‌[1]),
                },
            });
        }
        const query: any = {};
        if ($and.length > 0) {
            query.$and = $and;
        }
        const list = await this.repo.digitalPlans
            .find(query)
            .sort({ createdAt: -1 })
            .skip((filter.page - 1) * filter.pageSize)
            .limit(filter.pageSize)
            .exec();
        const ret = new DigitalPlanListDto();
        ret.list = list.map(e => new DigitalPlanDo(e).dto());
        ret.total = await this.repo.digitalPlans.countDocuments(query);
        return ret;
    }

    async add(dto: DigitalPlanDto) {
        const digitalPlan = new this.repo.digitalPlans();
        digitalPlan.name = dto.name;
        digitalPlan.url = dto.url;
        digitalPlan.updateTime = dto.updatedTime;
        digitalPlan.status = 0;
        digitalPlan.createdAt = new Date();
        digitalPlan.updatedAt = new Date();
        await digitalPlan.save();
    }

    async update(dto: DigitalPlanDto) {
        const digitalPlan = await this.repo.digitalPlans.findById(dto.id);
        if (digitalPlan == null) {
            Failed.throw("找不到数据");
        }
        digitalPlan.name = dto.name;
        digitalPlan.url = dto.url;
        digitalPlan.updateTime = dto.updatedTime;
        digitalPlan.updatedAt = new Date();
        await digitalPlan.save();
    }

    async remove(id: string) {
        const digitalPlan = await this.repo.digitalPlans.findById(id);
        if (digitalPlan == null) {
            Failed.throw("找不到数据");
        }
        digitalPlan.status = -1;
        digitalPlan.updatedAt = new Date();
        await digitalPlan.save();
    }
}
