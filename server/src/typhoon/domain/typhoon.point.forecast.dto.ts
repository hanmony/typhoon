import { ApiProperty } from "@nestjs/swagger";
import { TyphoonPointForecastPointDto } from "./typhoon.point.forecast.point.dto";

export class TyphoonPointForecastDto {
    forecastpoints: TyphoonPointForecastPointDto[] = [];
    tm = "";
}
