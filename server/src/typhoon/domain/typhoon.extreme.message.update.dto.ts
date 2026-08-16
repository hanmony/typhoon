import { ApiProperty } from "@nestjs/swagger";
import { TyphoonExtremeMessageCreateDto } from "./typhoon.extreme.message.create.dto";

export class TyphoonExtremeMessageUpdateDto extends TyphoonExtremeMessageCreateDto {
    @ApiProperty({ description: "事件ID" })
    id: string = "";
}
