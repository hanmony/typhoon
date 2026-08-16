import { Controller, Get, Query } from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from "@nestjs/swagger";
import { TyphoonService } from "../service/typhoon.service";
import { TyphoonSevereWeatherNewHistoryDto } from "../domain/typhoon.severe.weather.new.history.dto";
import { Public } from "src/security/lib/decorator/public.decorator";
import { TyphoonTwoDto } from "../domain/typhoon.two.dto";
import { TyphoonSevereWeatherNewDto } from "../domain/typhoon.severe.weather.new.dto";

@ApiBearerAuth()
@ApiTags("实时台风")
@Controller("typhoon")
export class TyphoonController {
    constructor(private readonly typhoon: TyphoonService) {}

    @Public()
    @ApiOperation({ description: "返回实时台风列表" })
    @Get("activity")
    @ApiResponse({ status: 200, type: [TyphoonTwoDto] })
    async getActivity(): Promise<TyphoonTwoDto[]> {
        return await this.typhoon.getActivity();
    }

    @ApiOperation({ description: "返回历史台风列表" })
    @Get("history")
    @ApiResponse({ status: 200, type: [TyphoonTwoDto] })
    async getHistory(@Query("year") year: number): Promise<TyphoonTwoDto[]> {
        return await this.typhoon.getHistory(year);
    }

    @ApiOperation({ description: "当前指挥内台风过境时间" })
    @Get("passTime")
    @ApiResponse({ status: 200, type: [Date] })
    async getPassTime(): Promise<Date[]> {
        return await this.typhoon.getPassTime();
    }

    @ApiOperation({ description: "返回灾害天气列表" })
    @Get("severe-weather")
    @ApiResponse({ status: 200, type: [TyphoonSevereWeatherNewDto] })
    async getSevereWeather(): Promise<TyphoonSevereWeatherNewDto[]> {
        return await this.typhoon.getSevereWeather();
    }

    @ApiOperation({ description: "返回当前指挥所有天气列表" })
    @Get("severe-weather-history")
    @ApiResponse({ status: 200, type: [TyphoonSevereWeatherNewHistoryDto] })
    async getSevereWeatherhistory(): Promise<TyphoonSevereWeatherNewHistoryDto[]> {
        return await this.typhoon.getSevereWeatherhistory();
    }
}
