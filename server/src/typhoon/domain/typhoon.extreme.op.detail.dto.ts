import { ApiProperty } from "@nestjs/swagger";
import { TyphoonExtremeOpDetailDocument } from "src/database/entity/typhoon.extreme.op.detail.schema";

export class TyphoonExtremeOpDetailCreateDto {
    @ApiProperty({ description: "线路" })
    line: string = "";
    @ApiProperty({ description: "是否阻碍行车" })
    isObstructing: number = 0;
    @ApiProperty({ description: "运营详情" })
    detail: string = "";
}

export class TyphoonExtremeOpDetailUpdateDto extends TyphoonExtremeOpDetailCreateDto {
    @ApiProperty({ description: "ID" })
    id: string = "";
    @ApiProperty({ description: "指挥ID" })
    commandId: string = "";
}
export class TyphoonExtremeOpDetailDto extends TyphoonExtremeOpDetailUpdateDto {
    @ApiProperty({ description: "创建时间" })
    createTime: Date = new Date();
    @ApiProperty({ description: "修改时间" })
    updateTime: Date = new Date();

    static fromDoc(doc: TyphoonExtremeOpDetailDocument): TyphoonExtremeOpDetailDto {
        const ret = new TyphoonExtremeOpDetailDto();
        ret.id = doc._id.toString();
        ret.commandId = doc.commandId;
        ret.line = doc.line;
        ret.isObstructing = doc.isObstructing;
        ret.detail = doc.detail;
        ret.createTime = doc.createTime;
        ret.updateTime = doc.updateTime;
        return ret;
    }
}
