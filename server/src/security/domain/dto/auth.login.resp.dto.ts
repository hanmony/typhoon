import { ApiProperty } from "@nestjs/swagger";

export class AuthLoginRespDto {
    @ApiProperty({ description: "Token" })
    token: string = "";
    @ApiProperty({ description: "name" })
    name: string = "";
    @ApiProperty({ description: "roles", type: [String] })
    roles: string[] = [];
    @ApiProperty({ description: "should init password", type: Boolean })
    password: boolean = false;
}
