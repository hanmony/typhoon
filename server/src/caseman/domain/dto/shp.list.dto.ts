import { ApiProperty } from "@nestjs/swagger";
import { ShpDto } from "./shp.dto";

export class ShpListDto {
    @ApiProperty({ description: "ID", type: [ShpDto] })
    list: ShpDto[] = [];

    @ApiProperty({ description: "ID", type: Number })
    total: number;
}
