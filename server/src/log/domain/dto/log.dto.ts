import { ApiProperty } from "@nestjs/swagger";

export class LogDto {
    @ApiProperty({ description: "ID", type: String })
    id: string;

    @ApiProperty({ description: "工号", type: String })
    user: string;

    @ApiProperty({ description: "姓名", type: String })
    name: string;

    @ApiProperty({ description: "部门", type: String })
    dept: string;

    @ApiProperty({ description: "岗位", type: String })
    job: string;

    @ApiProperty({ description: "模块", type: String })
    module: string;

    @ApiProperty({ description: "类型", type: String })
    title: string;

    @ApiProperty({ description: "url", type: String })
    url: string;

    @ApiProperty({ description: "ip", type: String })
    ip: string;

    @ApiProperty({ description: "客户端", type: String })
    useragent: string;

    @ApiProperty({ description: "请求", type: String })
    request: string;

    @ApiProperty({ description: "返回", type: String })
    response: string;

    @ApiProperty({ description: "日期", type: Date })
    createtime: Date;
}
