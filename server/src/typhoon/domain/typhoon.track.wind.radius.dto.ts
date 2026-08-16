import { ApiProperty } from "@nestjs/swagger";

export class TyphoonTrackWindRadiusDto {
    @ApiProperty({ description: "东北半径" })
    neRadius: string = "";
    @ApiProperty({ description: "东南半径" })
    seRadius: string = "";
    @ApiProperty({ description: "西南半径" })
    swRadius: string = "";
    @ApiProperty({ description: "西北半径" })
    nwRadius: string = "";
}
