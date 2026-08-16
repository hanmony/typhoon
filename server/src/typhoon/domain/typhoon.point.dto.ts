import { ApiProperty } from "@nestjs/swagger";
import { TyphoonPointForecastDto } from "./typhoon.point.forecast.dto";

export class TyphoonPointDto {
    ckposition: string = "";
    forecast: TyphoonPointForecastDto[] = [];
    jl: string = "";
    lat: string = "";
    lng: string = "";
    movedirection: string = "";
    movespeed: string = "";
    power: string = "";
    pressure: string = "";
    radius7: string = "";
    radius10: string = "";
    radius12: string = "";
    speed: string = "";
    strong: string = "";
    time: string = "";
}
