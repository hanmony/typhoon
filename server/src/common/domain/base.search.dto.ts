import { ApiProperty } from "@nestjs/swagger";

export class BaseSearchDto {
    @ApiProperty({ description: "页数", type: Number })
    page: number = 1;

    @ApiProperty({ description: "每页个数", type: Number })
    pageSize: number = 10;

    @ApiProperty({ description: "排序", type: String })
    sortPath: string = "";

    @ApiProperty({ description: "排序", type: String })
    sortType: string = "";
}
