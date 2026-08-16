import { Body, Controller, Get, Post } from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from "@nestjs/swagger";
import { TyphoonCommandService } from "../service/typhoon.command.service";
import { TyphoonCommandCreateDto } from "../domain/typhoon.command.create.dto";
import { CommonRespDto } from "src/common/domain/common.resp.dto";
import { TyphoonCommandDto } from "../domain/typhoon.command.dto";
import { ActionLog } from "src/diagnostics/lib/action.logger.interceptor";
import { TyphoonCommandDetailDto } from "../domain/typhoon.command.detail.dto";
import { TyphoonCommandDetailService } from "../service/typhoon.command.detail.service";

@ApiBearerAuth()
@ApiTags("台风指挥")
@Controller("typhoonCommand")
export class TyphoonCommandController {
    constructor(
        private readonly typhoonCommand: TyphoonCommandService,
        private readonly typhoonCommandDetail: TyphoonCommandDetailService,
    ) {}

    @ApiOperation({ description: "返回指挥列表" })
    @Get("info")
    @ApiResponse({ type: [TyphoonCommandDto] })
    async getInfo(): Promise<TyphoonCommandDto[]> {
        return await this.typhoonCommand.getInfo();
    }

    @ApiOperation({ description: "返回当前指挥详情" })
    @Get("detail")
    @ApiResponse({ type: [TyphoonCommandDto] })
    async getDetail(): Promise<TyphoonCommandDetailDto> {
        return await this.typhoonCommandDetail.getDetail();
    }

    @ApiOperation({ description: "开始新指挥" })
    @Post("add")
    @ActionLog("台风指挥", "开始新指挥")
    @ApiResponse({ type: CommonRespDto })
    async add(@Body() data: TyphoonCommandCreateDto): Promise<CommonRespDto> {
        await this.typhoonCommand.add(data);
        return CommonRespDto.succ();
    }

    @ApiOperation({ description: "更新应急防汛信息" })
    @Post("updateEmergencyResponse")
    @ActionLog("台风指挥", "更新应急防汛信息")
    @ApiResponse({ type: CommonRespDto })
    async updateEmergencyResponse(@Body() data: Partial<TyphoonCommandDto>): Promise<CommonRespDto> {
        await this.typhoonCommand.updateEmergencyResponse(data);
        return CommonRespDto.succ();
    }

    @ApiOperation({ description: "更新模拟开始时间" })
    @Post("updateSimulateStartTime")
    @ActionLog("台风指挥", "更新模拟开始时间")
    @ApiResponse({ type: CommonRespDto })
    async updateSimulateStartTime(@Body() data: { simulateStartTime: string }): Promise<CommonRespDto> {
        await this.typhoonCommand.updateSimulateStartTime(data.simulateStartTime);
        return CommonRespDto.succ();
    }

    @ApiOperation({ description: "关闭指挥" })
    @Get("close")
    @ActionLog("台风指挥", "关闭指挥")
    @ApiResponse({ type: CommonRespDto })
    async close(): Promise<CommonRespDto> {
        await this.typhoonCommand.close();
        return CommonRespDto.succ();
    }
}
