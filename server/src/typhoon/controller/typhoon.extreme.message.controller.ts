import { Body, Controller, Get, Post, Query } from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from "@nestjs/swagger";
import { CommonRespDto } from "src/common/domain/common.resp.dto";
import { User } from "src/security/lib/decorator/user.decorator";
import { UserDataDto } from "src/userman/domain/user.data.dto";
import { TyphoonExtremeMessageCreateDto } from "../domain/typhoon.extreme.message.create.dto";
import { TyphoonExtremeMessageDto } from "../domain/typhoon.extreme.message.dto";
import { TyphoonExtremeMessageUpdateDto } from "../domain/typhoon.extreme.message.update.dto";
import { TyphoonExtremeMessageService } from "../service/typhoon.extreme.message.service";
import { ActionLog } from "src/diagnostics/lib/action.logger.interceptor";

@ApiBearerAuth()
@ApiTags("台风消息")
@Controller("extreme/message")
export class TyphoonExtremeMessageController {
    constructor(private readonly typhoonExtremeMessage: TyphoonExtremeMessageService) {}

    @ApiOperation({ description: "返回列表" })
    @Get("padAll")
    @ApiResponse({ type: [TyphoonExtremeMessageDto] })
    async getPadAll(@User() user: UserDataDto): Promise<TyphoonExtremeMessageDto[]> {
        return await this.typhoonExtremeMessage.getPadAll(user);
    }

    @ApiOperation({ description: "返回列表" })
    @Get("all")
    @ApiResponse({ type: [TyphoonExtremeMessageDto] })
    async getAll(): Promise<TyphoonExtremeMessageDto[]> {
        return await this.typhoonExtremeMessage.getAll();
    }

    @ApiOperation({ description: "消息已读" })
    @Get("read")
    @ApiResponse({ type: CommonRespDto })
    async read(@User() user: UserDataDto, @Query("id") id: string) {
        await this.typhoonExtremeMessage.read(user, id);
        return CommonRespDto.succ();
    }

    @ApiOperation({ description: "新增" })
    @Post("add")
    @ActionLog("台风消息", "新增")
    @ApiResponse({ type: CommonRespDto })
    async add(@Body() data: TyphoonExtremeMessageCreateDto): Promise<CommonRespDto> {
        await this.typhoonExtremeMessage.add(data);
        return CommonRespDto.succ();
    }

    @ApiOperation({ description: "修改" })
    @Post("update")
    @ActionLog("台风消息", "修改")
    @ApiResponse({ type: CommonRespDto })
    async update(@Body() data: TyphoonExtremeMessageUpdateDto): Promise<CommonRespDto> {
        await this.typhoonExtremeMessage.update(data);
        return CommonRespDto.succ();
    }

    @ApiOperation({ description: "删除" })
    @Get("remove")
    @ActionLog("台风消息", "删除")
    @ApiResponse({ type: CommonRespDto })
    async remove(@Query("id") id: string): Promise<CommonRespDto> {
        await this.typhoonExtremeMessage.remove(id);
        return CommonRespDto.succ();
    }
}
