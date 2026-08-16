import { ApiProperty } from "@nestjs/swagger";

export class TyphoonTrackWindRadiusDto {
    @ApiProperty({ description: "东北象限半径" })
    ne: string = "";
    @ApiProperty({ description: "西北象限半径" })
    nw: string = "";
    @ApiProperty({ description: "东南象限半径" })
    se: string = "";
    @ApiProperty({ description: "西南象限半径" })
    sw: string = "";
}
