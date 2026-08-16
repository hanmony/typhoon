import { TyphoonDutyDto } from "./../domain/typhoon.duty.dto";
import { Body, Controller, Get, Post } from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from "@nestjs/swagger";
import { CommonRespDto } from "src/common/domain/common.resp.dto";
import { TyphoonDutyService } from "../service/typhoon.duty.service";
import { ActionLog } from "src/diagnostics/lib/action.logger.interceptor";

@ApiBearerAuth()
@ApiTags("台风值班")
@Controller("typhoonDuty")
export class TyphoonDutyController {
    constructor(private readonly typhoonDuty: TyphoonDutyService) {}

    @ApiOperation({ description: "返回值班列表" })
    @Get("list")
    @ApiResponse({ type: [TyphoonDutyDto] })
    async getList(): Promise<TyphoonDutyDto[]> {
        return await this.typhoonDuty.list();
    }

    @ApiOperation({ description: "批量更新值班" })
    @Post("batchUpdate")
    @ActionLog("台风值班", "批量更新值班")
    @ApiResponse({ type: CommonRespDto })
    async batchUpdate(@Body() data: TyphoonDutyDto[]): Promise<CommonRespDto> {
        await this.typhoonDuty.updateAll(data);
        return CommonRespDto.succ();
    }
}
