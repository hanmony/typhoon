import { ExcelColumn } from "src/common/service/excel/excel.file";

export class ExcelConfigDto {
    @ExcelColumn("类型")
    key: string = "";
    @ExcelColumn("分类")
    type: string = "";
    @ExcelColumn("值")
    value: string = "";
}
