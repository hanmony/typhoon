import { ApiProperty } from "@nestjs/swagger";

export class TyphoonSevereWeatherNewMessageTypeDto {

    @ApiProperty({ description: "预警信息性质代码 (new/update/cancel)" })
    code: string = "";

    @ApiProperty({ description: "当前预警取代或取消的预警ID列表", type: [String], required: false })
    supersedes: string[] = [];

}
