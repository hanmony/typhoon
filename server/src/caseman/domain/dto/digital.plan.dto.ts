import { ApiProperty } from "@nestjs/swagger";

export class DigitalPlanDto {
    @ApiProperty({ description: "ID", type: String })
    id: string;
    @ApiProperty({ description: "文件名", type: String })
    name: string;
    @ApiProperty({ description: "地址", type: String })
    url: string;
    @ApiProperty({ description: "预案更新时间" })
    updatedTime: Date;
    @ApiProperty({ description: "状态： 0: 正常, 1: 下架, 2: 编辑中, -1: 删除" })
    status = 0;
    @ApiProperty({ description: "创建时间" })
    createdAt: Date;
    @ApiProperty({ description: "更新时间" })
    updatedAt: Date;
}
