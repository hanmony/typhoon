import { ApiProperty } from "@nestjs/swagger";

export class TyphoonPointForecastPointDto {
    lat: string = "";
    lng: string = "";
    power: string = "";
    pressure: string = "";
    speed: string = "";
    strong: string = "";
    time: string = "";
}
