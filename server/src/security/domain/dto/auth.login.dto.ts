import { ApiProperty } from "@nestjs/swagger";
import { IsNotEmpty } from "class-validator";

/**
 * 登录请求数据
 */
export class AuthLoginDto {
    @ApiProperty({ description: "login username", type: "string", required: true })
    @IsNotEmpty()
    username: string;
    @ApiProperty({ description: "login password", type: "string", required: true })
    @IsNotEmpty()
    password: string;
}

export class AuthCodeLoginDto {
    @ApiProperty({ description: "login code", type: "string", required: true })
    @IsNotEmpty()
    code: string;
}
