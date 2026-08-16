import { ApiProperty } from "@nestjs/swagger";

export class TyphoonTwoLandDto {
    @ApiProperty({ description: "登陆强度等级" })
    level: string = "";
    @ApiProperty({ description: "登陆时间" })
    land_time: string = "";
    @ApiProperty({ description: "登陆地点" })
    land_adr: string = "";
    @ApiProperty({ description: "登陆信息" })
    land_info: string = "";
}
