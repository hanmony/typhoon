import { Injectable } from "@nestjs/common";
import { ExcelService } from "src/common/service/excel/excel.service";
import { ActionCategory } from "src/database/lib/action.category";
import { RepoService } from "src/database/service/repo/repo.service";
import { ExcelImporterBase } from "./lib/importer.base";
import { excelImportConfig } from "./lib/importer.config";
import { ExcelImporterPathInfo } from "./lib/importer.path.info";

@Injectable()
export class CaseImportService {
    constructor(
        private readonly excel: ExcelService,
        private readonly repo: RepoService,
    ) {}

    async importCase(path: string) {
        await this.repo.connection.transaction(async session => {
            const books = this.excel.open(path);
            const caseDoc = await excelImportConfig(books, this.repo.cases, session);
            // clear old case with same name
            await this.repo.cases.updateMany(
                { name: caseDoc.name, _id: { $ne: caseDoc.id }, status: 0 },
                { $set: { status: 1 } },
                { session },
            );
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
                const i = new ExcelImporterBase(this.repo, caseDoc);
                await i.importSheet(books, importer as ActionCategory, session);
            }
        });
    }

    async importPathInfo(caseId: string, path: string) {
        await this.repo.connection.transaction(async session => {
            const caseDoc = await this.repo.cases.findOne({ name: caseId });
            await this.repo.pathInfos.deleteMany({ caseId }, { session });
            const books = this.excel.open(path);
            const importer = new ExcelImporterPathInfo(session, this.repo, caseDoc);
            await importer.importSheet(books);
        });
    }
}
