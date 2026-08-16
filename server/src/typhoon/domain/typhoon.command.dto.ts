import { ApiProperty } from "@nestjs/swagger";
import { TyphoonCommandDocument } from "src/database/entity/typhoon.command.schema";

export class TyphoonCommandDto {
    @ApiProperty({ description: "指挥标题" })
    name: string = "";
    @ApiProperty({ description: "开始时间" })
    startTime: Date = new Date();
    // @ApiProperty({ description: "结束时间" })
    // endTime: Date = new Date();
    @ApiProperty({ description: "是否结束" })
    status: number = 0;
    @ApiProperty({ description: "是否模拟" })
    isSimulated: number = 0;
    @ApiProperty({ description: "模拟开始时间" })
    simulateStartTime?: Date = new Date();

    @ApiProperty({ description: "市级应急等级" })
    municipalDegree: string = "";
    @ApiProperty({ description: "市级应急开关" })
    municipalFlag: number = 0;
    @ApiProperty({ description: "集团级应急等级" })
    corporateDegree: string = "";
    @ApiProperty({ description: "集团级应急开关" })
    corporateFlag: number = 0;

    static fromDoc(doc: TyphoonCommandDocument): TyphoonCommandDto {
        const ret = new TyphoonCommandDto();
        ret.name = doc.name;
        ret.startTime = doc.startTime;
        ret.isSimulated = doc.isSimulated;
        ret.status = doc.status;
        ret.simulateStartTime = doc.simulateStartTime;
        ret.municipalDegree = doc.municipalDegree;
        ret.municipalFlag = doc.municipalFlag;
        ret.corporateDegree = doc.corporateDegree;
        ret.corporateFlag = doc.corporateFlag;
        return ret;
    }
}
