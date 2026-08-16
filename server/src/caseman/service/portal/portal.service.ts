import { Injectable } from "@nestjs/common";
import { CaseDocument, CaseStatus } from "src/database/entity/case.schema";
import { RepoService } from "src/database/service/repo/repo.service";

export type DiscoverCaseMap = Record<string, CaseDocument[]>;

export enum CaseCategory {
    range = "范围",
    damage = "危害",
    // prevent = "预防",
    distance = "距离",
    duration = "时间",
}
const degrees = ["超强台风", "强台风", "台风", "强热带风暴", "热带风暴", "热带低压"];
const directions = ["东", "东北", "东南", "南", "西", "西北", "西南", "北"];
const alerts = ["红色预警", "橙色预警", "黄色预警", "蓝色预警"];

export interface PortalCaseSearchParams {
    searchText?: string;
    year?: string[];
    category: CaseCategory[];
}

export interface DarkPortalCaseListParams {
    searchText?: string;
    year: string;
    order: string;
}
@Injectable()
export class PortalService {
    constructor(private readonly repo: RepoService) {}
    async getCasesMapByCategory(): Promise<DiscoverCaseMap> {
        const items = await this.repo.cases
            .find({ status: CaseStatus.normal }, {}, { sort: { createTime: -1 } })
            .exec();
        const label = "特殊展示归类";
        const result: DiscoverCaseMap = {};
        for (const item of items) {
            const values = item.values;
            const curValueDto = values.get(label);
            if (curValueDto && curValueDto.value) {
                if (!result[curValueDto.value]) {
                    result[curValueDto.value] = [];
                }
                if (result[curValueDto.value].length < 4) {
                    result[curValueDto.value].push(item);
                }
            }
        }
        return result;
    }
    async search(params: PortalCaseSearchParams): Promise<CaseDocument[]> {
        const items = await this.repo.cases
            .find({ status: CaseStatus.normal }, {}, { sort: { createTime: -1 } })
            .exec();
        const { searchText, year, category } = params;
        if (!searchText && (!year || !year.length) && (!category || !category.length)) {
            return items;
        }
        return items.filter(item => {
            const values = item.values;
            if (year && year.length) {
                const yearValueDto = values.get("台风年度");
                if (!yearValueDto || !yearValueDto.value) return false;
                if (!year.includes(yearValueDto.value)) return false;
            }
            if (category && category.length) {
                const cate = Array.isArray(category) ? category : [category];
                const cateValueDto = values.get("特殊展示归类");
                if (!cateValueDto || !cateValueDto.value) return false;
                if (!cate.find(c => cateValueDto.value.indexOf(c) !== -1)) return false;
            }
            if (!searchText) return true;

            const labels = ["台风命名", "台风类型", "台风最大预警等级"];
            for (const label of labels) {
                const value = values.get(label)?.value;
                if (value.indexOf(searchText) !== -1) {
                    return true;
                }
            }
            return false;
        });
    }
    keyWordFilter(item: CaseDocument, searchText: string) {
        const keyWords = ["台风命名", "台风年度", "台风编号", "英文名称", "台风类型", "台风最大预警等级"];
        for (const key of keyWords) {
            const value = item.values.get(key)?.value;
            if (value.indexOf(searchText) !== -1) {
                return true;
            }
        }
        return false;
    }
    async getListWithParams(params: DarkPortalCaseListParams) {
        const items = await this.repo.cases
            .find({ status: CaseStatus.normal }, {}, { sort: { createTime: -1 } })
            .exec();
        const { searchText, year, order } = params;
        let filteredItems = items;
        if (searchText) {
            filteredItems = items.filter(i => this.keyWordFilter(i, searchText));
        }
        if (!year && !order) return filteredItems;
        if (!year && order) return this.getOrderList(filteredItems, order);

        filteredItems = filteredItems.filter(item => {
            const values = item.values;
            if (year) {
                const yearValueDto = values.get("台风年度");
                if (!yearValueDto || !yearValueDto.value) return false;
                if (Number(year) === Number(yearValueDto.value)) return true;
            }
            return false;
        });
        if (!order) return filteredItems;
        return this.getOrderList(filteredItems, order);
    }
    getOrderList(items: CaseDocument[], orderKey: string) {
        switch (orderKey) {
            case "direction":
                return this.reorderList(items, directions, item => item.values.get("台风走向")?.value);
            case "degree":
                return this.reorderList(items, degrees, item => item.values.get("台风类型")?.value);
            case "alert":
                return this.reorderList(items, alerts, item => item.values.get("台风最大预警等级")?.value);
            default:
                return items;
        }
    }
    reorderList(items: CaseDocument[], according: string[], keyWordResolver: (item: CaseDocument) => string) {
        return items.slice().sort((a, b) => {
            const aString = keyWordResolver(a);
            const bString = keyWordResolver(b);
            return according.indexOf(aString) - according.indexOf(bString);
        });
    }
}
