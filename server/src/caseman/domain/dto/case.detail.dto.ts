import { ApiProperty } from "@nestjs/swagger";
import { ActionDocument } from "src/database/entity/action.schema";
import { CaseDocument } from "src/database/entity/case.schema";
import { PathInfoDocument } from "src/database/entity/path.info.schema";

export class CaseDetailDto {
    @ApiProperty({ description: "案例基本信息" })
    doc: CaseDocument;

    @ApiProperty({ description: "台风事件详情" })
    eventsMap: Map<string, ActionDocument[]>;

    @ApiProperty({ description: "台风路径信息" })
    pathInfo: PathInfoDocument[];

    // 添加序列化方法
    toJSON() {
        return {
            doc: this.doc,
            eventsMap: Object.fromEntries(this.eventsMap),
            pathInfo: this.pathInfo,
        };
    }
}
