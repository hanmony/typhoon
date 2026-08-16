import { ApiProperty } from "@nestjs/swagger";

export class UpdatePropertyDto {
    @ApiProperty({ description: "ID" })
    id: string = "";
    @ApiProperty({ description: "属性" })
    property: string = "";
    @ApiProperty({ description: "值" })
    value: unknown = "";
}
