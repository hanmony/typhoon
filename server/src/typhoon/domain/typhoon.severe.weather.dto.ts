import { ApiProperty } from "@nestjs/swagger";

export class TyphoonSevereWeatherDto {
    @ApiProperty({ description: "alertlevel" })
    alertlevel: string = "";
    @ApiProperty({ description: "alertlevels" })
    alertlevels: string = "";
    @ApiProperty({ description: "alertname" })
    alertname: string = "";
    @ApiProperty({ description: "alertnames" })
    alertnames: string = "";
    @ApiProperty({ description: "defenseguideline" })
    defenseguideline: string = "";
    @ApiProperty({ description: "forecaster" })
    forecaster: string = "";
    @ApiProperty({ description: "info" })
    info: string = "";
    @ApiProperty({ description: "preupdatelevel" })
    preupdatelevel: string = "";
    @ApiProperty({ description: "publishtime" })
    publishtime: string = "";
    @ApiProperty({ description: "publishtimes" })
    publishtimes: string = "";
    @ApiProperty({ description: "title" })
    title: string = "";
    @ApiProperty({ description: "warningstate" })
    warningstate: string = "";
}
