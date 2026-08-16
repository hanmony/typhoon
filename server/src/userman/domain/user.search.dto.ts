import { ApiProperty } from "@nestjs/swagger";
import { BaseSearchDto } from "src/common/domain/base.search.dto";

export class UserSearchDto extends BaseSearchDto {
    @ApiProperty({ description: "ID", type: Number })
    id: string = "";

    @ApiProperty({ description: "名字", type: Number })
    name: string = "";

    @ApiProperty({ description: "角色", type: String })
    role: string = "";

    @ApiProperty({ description: "部门", type: String })
    department: string = "";

    @ApiProperty({ description: "线路", type: String })
    line: string = "";
}
