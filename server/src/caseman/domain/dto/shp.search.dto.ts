import { ApiProperty } from "@nestjs/swagger";

export class ShpSearchDto {
    @ApiProperty({ description: "ID", type: String })
    id?: string;

    @ApiProperty({ description: "姓名", type: String })
    name?: string;

    @ApiProperty({ description: "url", type: String })
    url?: string;

    @ApiProperty({ description: "日期", type: [Date] })
    period‌?: Date[];

    @ApiProperty()
    page: number;
    @ApiProperty()
    pageSize: number; // if <=0, dont page, return all
}
