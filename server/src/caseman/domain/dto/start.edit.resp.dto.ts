import { ApiProperty } from "@nestjs/swagger";
import { IsNotEmpty } from "class-validator";

export class StartEditRespDto {
    @ApiProperty({ description: "编辑案例ID" })
    @IsNotEmpty()
    id: string = "";
}
