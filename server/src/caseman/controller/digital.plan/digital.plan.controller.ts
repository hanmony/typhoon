import { Body, Controller, Get, Post, Query } from "@nestjs/common";
import { ApiBearerAuth, ApiBody, ApiOperation, ApiQuery, ApiResponse, ApiTags } from "@nestjs/swagger";
import { DigitalPlanDto } from "src/caseman/domain/dto/digital.plan.dto";
import { DigitalPlanListDto } from "src/caseman/domain/dto/digital.plan.list.dto";
import { DigitalPlanSearchDto } from "src/caseman/domain/dto/digital.plan.search.dto";
import { DigitalPlanService } from "src/caseman/service/digital.plan/digital.plan.service";
import { CommonRespDto } from "src/common/domain/common.resp.dto";
import { ActionLog } from "src/diagnostics/lib/action.logger.interceptor";
import { RoleType } from "src/security/domain/role.type";
import { Roles } from "src/security/lib/decorator/roles.decorator";
import { User } from "src/security/lib/decorator/user.decorator";

@ApiBearerAuth()
@ApiTags("数字预案管理")
@Controller("digital/plan")
export class DigitalPlanController {
    constructor(private readonly digitalPlans: DigitalPlanService) {}

    @ApiOperation({ summary: "数字预案列表" })
    @ApiResponse({ type: DigitalPlanListDto })
    @ApiBody({ type: DigitalPlanSearchDto })
    @Roles(RoleType.admin, RoleType.manager, RoleType.editor)
    @Post("list")
    async list(@User() staffId: string, @Body() body: DigitalPlanSearchDto): Promise<DigitalPlanListDto> {
        return await this.digitalPlans.list(staffId, body);
    }

    @ApiOperation({ summary: "导入数字预案信息" })
    @ApiResponse({ status: 200, type: CommonRespDto })
    @Roles(RoleType.admin, RoleType.manager, RoleType.editor)
    @ActionLog("数字预案管理", "导入数字预案信息")
    @Post("add")
    async add(@Body() dto: DigitalPlanDto): Promise<CommonRespDto> {
        await this.digitalPlans.add(dto);
        return CommonRespDto.succ();
    }

    @ApiOperation({ summary: "导入数字预案信息" })
    @ApiResponse({ status: 200, type: CommonRespDto })
    @Roles(RoleType.admin, RoleType.manager, RoleType.editor)
    @ActionLog("数字预案管理", "导入数字预案信息")
    @Post("update")
    async update(@Body() dto: DigitalPlanDto): Promise<CommonRespDto> {
        await this.digitalPlans.update(dto);
        return CommonRespDto.succ();
    }

    @ApiOperation({ description: "数字预案删除" })
    @ActionLog("数字预案管理", "删除")
    @Get("remove")
    @ApiResponse({ type: CommonRespDto })
    async remove(@Query("id") id: string): Promise<CommonRespDto> {
        await this.digitalPlans.remove(id);
        return CommonRespDto.succ();
    }
}
