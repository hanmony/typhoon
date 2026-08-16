import { Logger } from "@nestjs/common";
import { validate } from "class-validator";
import { ClientSession } from "mongoose";
import { ExcelBaseDto } from "src/caseman/domain/dto/excels/excel.base.dto";
import { ExcelFile } from "src/common/service/excel/excel.file";
import { ActionDocument } from "src/database/entity/action.schema";
import { CaseDocument } from "src/database/entity/case.schema";
import { ActionCategory } from "src/database/lib/action.category";
import { RepoService } from "src/database/service/repo/repo.service";
import { Failed } from "src/diagnostics/lib/failed";

export class ExcelImporterBase {
    constructor(
        protected readonly repo: RepoService,
        protected readonly caseDoc: CaseDocument,
    ) {}

    async importSheet(excel: ExcelFile, category: ActionCategory, session: ClientSession) {
        logger.log(`import ${category} sheet`);
        excel.use(category);
        let line = 1;
        const rows: ActionDocument[] = [];
        while (excel.next()) {
            line++;
            const row = await this.importRow(excel, line, category).catch(err => {
                Failed.throw(`${category}: ${line}行, 数据不正确, ${err}`);
            });
            if (row) {
                rows.push(row);
            }
        }

        await this.repo.actions.insertMany(rows, { session });
    }

    protected async validate(category: ActionCategory, line: number, item: object) {
        const result = await validate(item);
        if (result.length > 0) {
            logger.error(JSON.stringify(item));
            for (const item of result) {
                logger.error(item);
            }
        }
        Failed.check(result.length <= 0, `${category}: ${line}行, 数据不正确`);
    }

    protected async importRow(excel: ExcelFile, line: number, category: ActionCategory): Promise<ActionDocument> {
        const doc = new this.repo.actions();
        const baseDto = new ExcelBaseDto();
        excel.parseTo(baseDto);

        await this.validate(category, line, baseDto);

        doc.caseId = this.caseDoc.id;
        doc.caseName = this.caseDoc.name;
        doc.fromDate = baseDto.startDate;
        doc.toDate = baseDto.endDate;
        doc.category = category;
        doc.items = new Map<string, string>();

        const keys = excel.getSheetKeys();
        for (const key of keys) {
            doc.items.set(key, excel.getCell(key));
        }

        return doc;
    }
}

const logger = new Logger("ExcelImporterBase");
