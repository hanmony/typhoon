import { ApiProperty } from "@nestjs/swagger";
import { IsNotEmpty } from "class-validator";

export class StartEditDto {
    @ApiProperty({ description: "要编辑的案例ID" })
    @IsNotEmpty()
    id: string = "";
}
