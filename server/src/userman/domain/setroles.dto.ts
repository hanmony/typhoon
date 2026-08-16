import { ApiProperty } from "@nestjs/swagger";
import { RoleType } from "src/security/domain/role.type";

export class SetRolesDto {
    @ApiProperty({ description: "Username" })
    username: string = "";
    @ApiProperty({ description: "Roles" })
    roles: RoleType[] = [];
}
