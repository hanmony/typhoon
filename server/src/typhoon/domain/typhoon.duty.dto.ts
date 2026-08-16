import { TyphoonDutyDocument } from "./../../database/entity/typhoon.duty.schema";
import { ApiProperty } from "@nestjs/swagger";

export class TyphoonDutyDto {
    @ApiProperty({ description: "指挥ID" })
    commandId: string = "";
    @ApiProperty({ description: "值班日期 YYYY-MM-DD" })
    date: string = "";
    @ApiProperty({ description: "公司/部门名称" })
    department: string = "";
    @ApiProperty({ description: "当日值班人" })
    responsible: string = "";

    static fromDoc(doc: TyphoonDutyDocument): TyphoonDutyDto {
        const ret = new TyphoonDutyDto();
        ret.commandId = doc.commandId;
        ret.date = doc.date;
        ret.department = doc.department;
        ret.responsible = doc.responsible;
        return ret;
    }
}
