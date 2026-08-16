import { Body, Controller, Get, Post, Query } from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from "@nestjs/swagger";
import { CommonRespDto } from "src/common/domain/common.resp.dto";
import { TyphoonPatrollingTourCreateDto, TyphoonPatrollingTourDto } from "../domain/typhoon.extreme.patrolling.dto";
import { TyphoonPatrollingService } from "../service/typhoon.extreme.patrolling.service";
import { ActionLog } from "src/diagnostics/lib/action.logger.interceptor";

@ApiBearerAuth()
@ApiTags("台风巡道")
@Controller("patrolling/tour")
export class TyphoonPatrollingController {
    constructor(private readonly service: TyphoonPatrollingService) {}

    @ApiOperation({ description: "巡道列表" })
    @Get("list")
    @ApiResponse({ type: [TyphoonPatrollingTourDto] })
    async getList(): Promise<TyphoonPatrollingTourDto[]> {
        return await this.service.getTours();
    }

    @ApiOperation({ description: "新增巡道" })
    @Post("add")
    @ActionLog("台风巡道", "新增巡道")
    @ApiResponse({ type: CommonRespDto })
    async add(@Body() data: TyphoonPatrollingTourCreateDto): Promise<TyphoonPatrollingTourDto> {
        return await this.service.add(data);
    }

    @ApiOperation({ description: "删除" })
    @Get("remove")
    @ActionLog("台风巡道", "删除")
    @ApiResponse({ type: CommonRespDto })
    async remove(@Query("id") id: string): Promise<CommonRespDto> {
        await this.service.remove(id);
        return CommonRespDto.succ();
    }

    @ApiOperation({ description: "关闭指挥" })
    @Get("removeAllByLine")
    @ActionLog("台风巡道", "关闭指挥")
    @ApiResponse({ type: CommonRespDto })
    async removeAllByLine(@Query("line") line: string): Promise<CommonRespDto> {
        await this.service.removeAllByLine(line);
        return CommonRespDto.succ();
    }
}
