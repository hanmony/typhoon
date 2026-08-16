import { ApiProperty } from "@nestjs/swagger";
import { LogDto } from "./log.dto";

export class LogListDto {
    @ApiProperty({ description: "ID", type: [LogDto] })
    list: LogDto[] = [];

    @ApiProperty({ description: "ID", type: Number })
    total: number;
}
