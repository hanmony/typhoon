import { ApiProperty } from "@nestjs/swagger";

export class TyphoonSevereWeatherNewEventTypeDto {
    @ApiProperty({ description: "预警事件类型的代码" })
    code: string = "";

    @ApiProperty({ description: "预警事件类型的名称" })
    name: string = "";
}
