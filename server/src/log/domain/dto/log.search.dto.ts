import { ApiProperty } from "@nestjs/swagger";

export class LogSearchDto {
    @ApiProperty({ description: "ID", type: String })
    id?: string;

    @ApiProperty({ description: "工号", type: String })
    user?: string;

    @ApiProperty({ description: "姓名", type: String })
    name?: string;

    @ApiProperty({ description: "类型", type: String })
    title?: string;

    @ApiProperty({ description: "url", type: String })
    url?: string;

    @ApiProperty({ description: "ip", type: String })
    ip?: string;

    @ApiProperty({ description: "客户端", type: String })
    useragent?: string;

    @ApiProperty({ description: "请求", type: String })
    request?: string;

    @ApiProperty({ description: "返回", type: String })
    response?: string;

    @ApiProperty({ description: "日期", type: [Date] })
    period‌?: Date[];

    @ApiProperty()
    page: number;
    @ApiProperty()
    pageSize: number; // if <=0, dont page, return all
}
