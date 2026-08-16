import { ApiProperty } from "@nestjs/swagger";
import { TyphoonPatrollingTourDocument } from "src/database/entity/typhoon.extreme.tour.schema";

export class TyphoonPatrollingTourCreateDto {
    @ApiProperty({ description: "线路" })
    line: string = "";
    @ApiProperty({ description: "路径信息" })
    identifiers: string[] = [];
    @ApiProperty({ description: "开始时间" })
    startTime: Date = new Date();
    @ApiProperty({ description: "速度" })
    speed: number = 0;
    @ApiProperty({ description: "序号" })
    serialNumber: number = 0;
}

export class TyphoonPatrollingTourDto extends TyphoonPatrollingTourCreateDto {
    @ApiProperty({ description: "ID" })
    id: string = "";
    @ApiProperty({ description: "创建时间" })
    createTime: Date = new Date();

    static fromDoc(doc: TyphoonPatrollingTourDocument): TyphoonPatrollingTourDto {
        const ret = new TyphoonPatrollingTourDto();
        ret.id = doc._id.toString();
        ret.serialNumber = doc.serialNumber;
        ret.line = doc.line;
        ret.identifiers = doc.identifiers;
        ret.startTime = doc.startTime;
        ret.createTime = doc.createTime;
        ret.speed = doc.speed;
        return ret;
    }
}
