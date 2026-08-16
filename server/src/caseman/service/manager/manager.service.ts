import { Injectable } from "@nestjs/common";
import { CaseDetailDto } from "src/caseman/domain/dto/case.detail.dto";
import { isNullOrEmpty } from "src/common/lib/string.helper";
import { ActionDocument } from "src/database/entity/action.schema";
import { CaseDocument, CaseStatus } from "src/database/entity/case.schema";
import { PathInfoDocument } from "src/database/entity/path.info.schema";
import { RepoService } from "src/database/service/repo/repo.service";
import { Failed } from "src/diagnostics/lib/failed";

@Injectable()
export class ManagerService {
    constructor(private readonly repo: RepoService) {}

    /**
     * 返回所有案例
     */
    async getCases(status: CaseStatus): Promise<CaseDocument[]> {
        const items = await this.repo.cases.find({ status }, {}, { sort: { createTime: -1 } }).exec();
        return items;
    }

    /**
     * 返回案例
     */
    async getCase(id: string): Promise<CaseDocument> {
        const item = await this.repo.cases.findOne({ _id: id }).exec();
        return item;
    }

    /**
     * 返回案例
     */
    async getCaseDetail(id: string): Promise<CaseDetailDto> {
        const dto = new CaseDetailDto();
        const doc = await this.repo.cases.findOne({ _id: id }).exec();
        dto.doc = doc;
        const pathInfos = await this.repo.pathInfos.find({ id }).sort({ time: 1 }).exec();
        dto.pathInfo = pathInfos;
        dto.eventsMap = new Map<string, ActionDocument[]>();
        const importers = [
            "重点事件表",
            "天气预警发布",
            "预警发布及响应",
            "路网指令措施",
            "线路行车措施",
            "受台风影响运营事件",
            "施工调整",
            "客运措施",
            "客运处置",
            "信息报告",
            "媒体宣传",
        ];
        for (const importer of importers) {
            const query: Record<string, unknown> = {};
            query.category = importer;
            query.caseId = id;
            const events = await this.repo.actions.find(query).sort({ fromDate: 1 }).exec();
            dto.eventsMap.set(importer, events ?? []);
        }
        return dto;
    }

    /**
     * 返回台风路径信息
     */
    async getPathInfos(caseId: string): Promise<PathInfoDocument[]> {
        const item = await this.repo.pathInfos.find({ caseId }).sort({ time: 1 }).exec();
        return item;
    }

    /**
     * 返回指定事件的下一个事件
     * @param caseId 案例ID
     * @param lastEventId 事件ID，不指定会返回第一个事件
     * @returns
     */
    async getNextEvent(caseId: string, lastEventId: string | undefined): Promise<ActionDocument> {
        Failed.check(caseId, "caseId is required");
        const query: Record<string, unknown> = { caseId };
        if (!isNullOrEmpty(lastEventId)) {
            query._id = { $gt: lastEventId };
        }
        const event = await this.repo.actions.findOne(query, {}, { sort: { fromDate: 1 } }).exec();
        return event;
    }

    /**
     * 返回指定类型的所有事件
     * @param caseId
     * @param category
     */
    async getEvents(caseId: string, category: string): Promise<ActionDocument[]> {
        const query: Record<string, unknown> = { caseId };
        if (!isNullOrEmpty(category)) {
            query.category = category;
        }
        const items = await this.repo.actions.find(query).sort({ fromDate: 1 }).exec();
        return items;
    }
}
