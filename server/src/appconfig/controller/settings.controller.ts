import { Body, Controller, Get, Logger, Post, Query } from "@nestjs/common";
import { ApiBearerAuth, ApiBody, ApiOperation, ApiResponse, ApiTags } from "@nestjs/swagger";
import { UpdateSettingDto } from "../domain/dto/update.setting.dto";
import { SettingsService } from "../service/settings/settings.service";
import { SettingEntity } from "src/database/entity/settings.schema";
import { CommonRespDto } from "src/common/domain/common.resp.dto";
import { ActionLog } from "src/diagnostics/lib/action.logger.interceptor";

@ApiBearerAuth()
@ApiTags("系统配置")
@Controller("settings")
export class SettingsController {
    constructor(private readonly settings: SettingsService) {}

    @ApiOperation({ summary: "获取所有配置" })
    @ApiResponse({ type: [SettingEntity] })
    @Get("all")
    async all(): Promise<SettingEntity[]> {
        return this.settings.all();
    }

    @ApiOperation({ description: "智控调度系统配置" })
    @Get("typhoonCommand")
    @ApiResponse({ type: SettingEntity })
    async getTyphoonCommandInfo(): Promise<SettingEntity> {
        return this.settings.getTyphoonCommandInfo();
    }

    @ApiOperation({ description: "智控调度系统配置更新" })
    @Get("typhoonCommandUpdate")
    @ActionLog("系统配置", "智控调度系统配置更新")
    @ApiResponse({ type: CommonRespDto })
    async typhoonCommandUpdate(@Query("value") value: string): Promise<CommonRespDto> {
        this.settings.typhoonCommandUpdate(value);
        return CommonRespDto.succ();
    }

    @ApiOperation({ summary: "设置配置" })
    @ApiBody({ type: UpdateSettingDto })
    @ApiResponse({ type: CommonRespDto })
    @ActionLog("系统配置", "设置配置")
    @Post("update")
    async update(@Body() body: UpdateSettingDto): Promise<CommonRespDto> {
        this.settings.setValue(body.name, body.value);
        return CommonRespDto.succ();
    }
}

export const logger = new Logger(SettingsController.name);
