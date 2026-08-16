import { Controller, Get, Post, Put, Delete, Param, Body } from "@nestjs/common";
import { ApiBearerAuth, ApiTags, ApiOperation } from "@nestjs/swagger";
import { LlmModelService } from "../service/llm-model.service";
import { CreateLlmModelDto, UpdateLlmModelDto, SetLlmModelRoleDto, TestLlmModelDto } from "../domain/llm-model.dto";
import { RoleType } from "src/security/domain/role.type";
import { Roles } from "src/security/lib/decorator/roles.decorator";
import { CommonRespDto } from "src/common/domain/common.resp.dto";

@ApiBearerAuth()
@ApiTags("模型管理")
@Controller("llm-models")
export class LlmModelController {
    constructor(private readonly service: LlmModelService) {}

    @ApiOperation({ summary: "获取模型列表" })
    @Roles(RoleType.admin, RoleType.manager)
    @Get()
    async list() {
        return this.service.list();
    }

    @ApiOperation({ summary: "创建模型" })
    @Roles(RoleType.admin, RoleType.manager)
    @Post()
    async create(@Body() dto: CreateLlmModelDto) {
        return this.service.create(dto);
    }

    @ApiOperation({ summary: "更新模型" })
    @Roles(RoleType.admin, RoleType.manager)
    @Put(":id")
    async update(@Param("id") id: string, @Body() dto: UpdateLlmModelDto) {
        return this.service.update(id, dto);
    }

    @ApiOperation({ summary: "删除模型" })
    @Roles(RoleType.admin, RoleType.manager)
    @Delete(":id")
    async delete(@Param("id") id: string) {
        await this.service.delete(id);
        return CommonRespDto.succ();
    }

    @ApiOperation({ summary: "设置默认模型角色" })
    @Roles(RoleType.admin, RoleType.manager)
    @Put(":id/role")
    async setRole(@Param("id") id: string, @Body() dto: SetLlmModelRoleDto) {
        await this.service.setRole(id, dto);
        return CommonRespDto.succ();
    }

    @ApiOperation({ summary: "测试模型连接" })
    @Roles(RoleType.admin, RoleType.manager)
    @Post("test")
    async test(@Body() dto: TestLlmModelDto) {
        return this.service.testConnection(dto);
    }
}
