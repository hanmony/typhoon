import { ApiProperty } from "@nestjs/swagger";

/**
 * 一般的返回消息
 */
export class CommonRespDto {
    @ApiProperty({ description: "返回码" })
    code: number;
    @ApiProperty({ description: "返回消息" })
    message?: string;

    static succ(message?: string) {
        return { code: 0, message };
    }

    static failed(code: number, message: string) {
        return { code, message };
    }
}
