import { ApiProperty } from "@nestjs/swagger";

// {"userName":"testalk","userCode":"testalk","deptName":"调度指挥部","deptCode":"16","posName":"办事员","posCode":"P163","timestamp":1699509660946}
export class X5UserInfoDto {
    @ApiProperty({ description: "用户名" })
    userName: string = "";
    @ApiProperty({ description: "用户编号" })
    userCode: string = "";
    @ApiProperty({ description: "部门" })
    deptName: string = "";
    @ApiProperty({ description: "岗位名称" })
    posName: string = "";
    @ApiProperty({ description: "岗位编号" })
    posCode: string = "";
    @ApiProperty({ description: "时间戳" })
    timestamp: number = 0;
}
