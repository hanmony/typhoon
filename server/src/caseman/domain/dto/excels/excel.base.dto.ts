import { IsDate } from "class-validator";
import { ExcelColumn, excelDateParser } from "src/common/service/excel/excel.file";
import { ActionEntity } from "src/database/entity/action.schema";
import { CaseDocument } from "src/database/entity/case.schema";

/**
 * Base excel data
 */
export class ExcelBaseDto {
    @ExcelColumn("开始时间", excelDateParser)
    @IsDate()
    startDate: Date = new Date(3000, 0);
    @ExcelColumn("结束时间", excelDateParser)
    endDate: Date = new Date(3000, 0);

    copyBaseFromDoc(entity: ActionEntity, doc: CaseDocument) {
        entity.caseId = doc.id;
        entity.caseName = doc.name;
        entity.fromDate = this.startDate;
        entity.toDate = this.endDate;
    }
}
