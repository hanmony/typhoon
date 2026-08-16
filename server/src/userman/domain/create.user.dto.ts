import { ApiProperty } from "@nestjs/swagger";
import { ExcelColumn } from "src/common/service/excel/excel.file";
import { RoleType } from "src/security/domain/role.type";

export class CreateUserDto {
    @ExcelColumn("工作证号")
    @ApiProperty({ description: "Username" })
    username: string = "";
    @ExcelColumn("人员")
    @ApiProperty({ description: "Nickname" })
    nickname: string = "";
    @ApiProperty({ description: "roles" })
    roles: string[] = [];
    @ApiProperty({ description: "department" })
    department: string = "";
    status: number = 0;
    @ExcelColumn("岗位")
    job: string = "";
    @ExcelColumn("账号")
    @ApiProperty({ description: "Username" })
    usernameTwo: string = "";
    @ExcelColumn("名字")
    @ApiProperty({ description: "Nickname" })
    nicknameTwo: string = "";
    @ExcelColumn("密码")
    password: string = "";
    @ExcelColumn("线路")
    line: string = "";
    @ExcelColumn("角色")
    role: string = "";
}
