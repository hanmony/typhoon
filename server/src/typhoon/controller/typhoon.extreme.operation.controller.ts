import { Body, Controller, Get, Post, Query } from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from "@nestjs/swagger";
import { CommonRespDto } from "src/common/domain/common.resp.dto";
import { TyphoonExtremeOperationService } from "../service/typhoon.extreme.operation.service";
import { TyphoonExtremeOperationDto } from "../domain/typhoon.extreme.operation.dto";
import { TyphoonExtremeOperationCreateDto } from "../domain/typhoon.extreme.operation.create.dto";
import {
    BatchUpdateOperationParams,
    TyphoonExtremeOperationUpdateDto,
} from "../domain/typhoon.extreme.operation.update.dto";
import { ActionLog } from "src/diagnostics/lib/action.logger.interceptor";
import {
    TyphoonExtremeOpDetailCreateDto,
    TyphoonExtremeOpDetailDto,
    TyphoonExtremeOpDetailUpdateDto,
} from "../domain/typhoon.extreme.op.detail.dto";

@ApiBearerAuth()
@ApiTags("台风极端气象")
@Controller("extreme/operation")
export class TyphoonExtremeOperationController {
    constructor(private readonly typhoonExtremeOperation: TyphoonExtremeOperationService) {}

    @ApiOperation({ description: "返回列表" })
    @Get("all")
    @ApiResponse({ type: [TyphoonExtremeOperationDto] })
    async getAll(): Promise<TyphoonExtremeOperationDto[]> {
        return await this.typhoonExtremeOperation.getAll();
    }

    @ApiOperation({ description: "新增" })
    @Post("add")
    @ActionLog("台风运营调整", "新增")
    @ApiResponse({ type: CommonRespDto })
    async add(@Body() data: TyphoonExtremeOperationCreateDto): Promise<CommonRespDto> {
        await this.typhoonExtremeOperation.add(data);
        return CommonRespDto.succ();
    }

    @ApiOperation({ description: "修改" })
    @Post("update")
    @ActionLog("台风运营调整", "修改")
    @ApiResponse({ type: CommonRespDto })
    async update(@Body() data: TyphoonExtremeOperationUpdateDto): Promise<CommonRespDto> {
        await this.typhoonExtremeOperation.update(data);
        return CommonRespDto.succ();
    }

    @ApiOperation({ description: "部分修改" })
    @ActionLog("台风运营调整", "部分修改")
    @Post("partial-update")
    @ApiResponse({ type: CommonRespDto })
    async partialUpdate(
        @Body() data: Partial<TyphoonExtremeOperationUpdateDto> & { id: string },
    ): Promise<CommonRespDto> {
        await this.typhoonExtremeOperation.partialUpdate(data);
        return CommonRespDto.succ();
    }

    @ApiOperation({ description: "批量部分修改" })
    @ActionLog("台风运营调整", "批量部分修改")
    @Post("batch-partial-update")
    @ApiResponse({ type: CommonRespDto })
    async batchPartialUpdate(@Body() data: BatchUpdateOperationParams): Promise<CommonRespDto> {
        await this.typhoonExtremeOperation.batchUpdatePartial(data);
        return CommonRespDto.succ();
    }

    @ApiOperation({ description: "删除" })
    @Get("remove")
    @ActionLog("台风运营调整", "删除")
    @ApiResponse({ type: CommonRespDto })
    async remove(@Query("id") id: string): Promise<CommonRespDto> {
        await this.typhoonExtremeOperation.remove(id);
        return CommonRespDto.succ();
    }

    @ApiOperation({ description: "返回运营详情列表" })
    @Get("all-detail")
    @ApiResponse({ type: [TyphoonExtremeOpDetailDto] })
    async getAllDetail(): Promise<TyphoonExtremeOpDetailDto[]> {
        return await this.typhoonExtremeOperation.getAllDetail();
    }

    @ApiOperation({ description: "新增运营详情" })
    @Post("add-detail")
    @ActionLog("台风运营调整", "新增运营详情")
    @ApiResponse({ type: CommonRespDto })
    async addDetail(@Body() data: TyphoonExtremeOpDetailCreateDto): Promise<CommonRespDto> {
        await this.typhoonExtremeOperation.addDetail(data);
        return CommonRespDto.succ();
    }

    @ApiOperation({ description: "修改运营详情" })
    @Post("update-detail")
    @ActionLog("台风运营调整", "修改运营详情")
    @ApiResponse({ type: CommonRespDto })
    async updateDetail(@Body() data: TyphoonExtremeOpDetailUpdateDto): Promise<CommonRespDto> {
        await this.typhoonExtremeOperation.updateDetail(data);
        return CommonRespDto.succ();
    }

    @ApiOperation({ description: "删除运营详情" })
    @Get("remove-detail")
    @ActionLog("台风运营调整", "删除运营详情")
    @ApiResponse({ type: CommonRespDto })
    async removeDetail(@Query("line") line: string): Promise<CommonRespDto> {
        await this.typhoonExtremeOperation.removeDetail(line);
        return CommonRespDto.succ();
    }
}
