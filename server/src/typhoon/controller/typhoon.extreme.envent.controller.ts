import { Body, Controller, Get, Post, Query } from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from "@nestjs/swagger";
import { CommonRespDto } from "src/common/domain/common.resp.dto";
import { TyphoonExtremeEventService } from "../service/typhoon.extreme.event.service";
import { TyphoonExtremeEventDto } from "../domain/typhoon.extreme.event.dto";
import { TyphoonExtremeEventCreateDto } from "../domain/typhoon.extreme.event.create.dto";
import { BatchUpdateEventParams, TyphoonExtremeEventUpdateDto } from "../domain/typhoon.extreme.event.update.dto";
import { TyphoonExtremeEventInfoDto } from "../domain/typhoon.extreme.event.info.dto";
import { ActionLog } from "src/diagnostics/lib/action.logger.interceptor";

@ApiBearerAuth()
@ApiTags("台风事件")
@Controller("extreme/event")
export class TyphoonExtremeEventController {
    constructor(private readonly typhoonExtremeEvent: TyphoonExtremeEventService) {}

    @ApiOperation({ description: "返回事件信息" })
    @Get("info")
    @ApiResponse({ type: TyphoonExtremeEventInfoDto })
    async getInfo(@Query("line") line: string): Promise<TyphoonExtremeEventInfoDto> {
        return await this.typhoonExtremeEvent.getInfo(line);
    }

    @ApiOperation({ description: "返回列表" })
    @Get("all")
    @ApiResponse({ type: [TyphoonExtremeEventDto] })
    async getAll(): Promise<TyphoonExtremeEventDto[]> {
        return await this.typhoonExtremeEvent.getAll();
    }

    @ApiOperation({ description: "新增" })
    @Post("add")
    @ActionLog("台风事件", "新增")
    @ApiResponse({ type: CommonRespDto })
    async add(@Body() data: TyphoonExtremeEventCreateDto): Promise<CommonRespDto> {
        await this.typhoonExtremeEvent.add(data);
        return CommonRespDto.succ();
    }

    @ApiOperation({ description: "修改" })
    @ActionLog("台风事件", "修改")
    @Post("update")
    @ApiResponse({ type: CommonRespDto })
    async update(@Body() data: TyphoonExtremeEventUpdateDto): Promise<CommonRespDto> {
        await this.typhoonExtremeEvent.update(data);
        return CommonRespDto.succ();
    }

    @ApiOperation({ description: "部分修改" })
    @ActionLog("台风事件", "部分修改")
    @Post("partial-update")
    @ApiResponse({ type: CommonRespDto })
    async partialUpdate(@Body() data: Partial<TyphoonExtremeEventUpdateDto> & { id: string }): Promise<CommonRespDto> {
        await this.typhoonExtremeEvent.partialUpdate(data);
        return CommonRespDto.succ();
    }

    @ApiOperation({ description: "批量部分修改" })
    @ActionLog("台风事件", "批量部分修改")
    @Post("batch-partial-update")
    @ApiResponse({ type: CommonRespDto })
    async batchPartialUpdate(@Body() data: BatchUpdateEventParams): Promise<CommonRespDto> {
        await this.typhoonExtremeEvent.batchUpdatePartial(data);
        return CommonRespDto.succ();
    }

    @ApiOperation({ description: "删除" })
    @ActionLog("台风事件", "删除")
    @Get("remove")
    @ApiResponse({ type: CommonRespDto })
    async remove(@Query("id") id: string): Promise<CommonRespDto> {
        await this.typhoonExtremeEvent.remove(id);
        return CommonRespDto.succ();
    }
}
