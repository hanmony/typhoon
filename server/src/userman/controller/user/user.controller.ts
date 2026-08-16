import { Body, Controller, Get, Post, UploadedFile, UseInterceptors } from "@nestjs/common";
import { FileInterceptor } from "@nestjs/platform-express";
import { ApiBearerAuth, ApiBody, ApiOperation, ApiResponse } from "@nestjs/swagger";
import { CommonRespDto } from "src/common/domain/common.resp.dto";
import { RepoService } from "src/database/service/repo/repo.service";
import { ActionLog } from "src/diagnostics/lib/action.logger.interceptor";
import { Failed } from "src/diagnostics/lib/failed";
import { RoleType } from "src/security/domain/role.type";
import { Roles } from "src/security/lib/decorator/roles.decorator";
import { User } from "src/security/lib/decorator/user.decorator";
import { ChangePasswordDto } from "src/userman/domain/change.password.dto";
import { CreateUserDto } from "src/userman/domain/create.user.dto";
import { EncryptionParamDto } from "src/userman/domain/encryption.param.dto";
import { SetRolesDto } from "src/userman/domain/setroles.dto";
import { UserDataDto } from "src/userman/domain/user.data.dto";
import { UserSearchDto } from "src/userman/domain/user.search.dto";
import { UsernameDto } from "src/userman/domain/username.dto";
import { UserService } from "src/userman/service/user/user.service";

@ApiBearerAuth()
@Controller("user")
export class UserController {
    constructor(
        private readonly repo: RepoService,
        private readonly users: UserService,
    ) {}

    @ApiOperation({ description: "获取所有正常状态的用户，不包括超管账号" })
    @ApiResponse({ type: [UserDataDto] })
    @Get("all")
    async getUsers(): Promise<UserDataDto[]> {
        return this.users.getAll();
    }

    @ApiOperation({ description: "获取所有正常状态的用户，不包括超管账号" })
    @ApiResponse({ type: [UserDataDto] })
    @Roles(RoleType.admin, RoleType.manager)
    @Post("list")
    async getList(@Body() data: UserSearchDto): Promise<UserDataDto[]> {
        return this.users.getList(data);
    }

    @ApiOperation({ summary: "用户信息", description: "用户信息接口" })
    @Get("my-info")
    async getInfo(@User() user: UserDataDto): Promise<UserDataDto> {
        Failed.check(user, "用户信息获取失败");
        const staff = await this.repo.staffs.findOne({ username: user.id });
        const ret = {
            id: staff.username,
            name: staff.nickname,
            roles: staff.roles,
            department: staff.department,
            job: staff.job,
            line: staff.line,
        };
        return ret;
    }

    @ApiOperation({ summary: "创建用户", description: "创建用户接口" })
    @ApiResponse({ type: UserDataDto })
    @ApiBody({ type: CreateUserDto })
    @Roles(RoleType.admin, RoleType.manager)
    @ActionLog("用户管理", "创建用户")
    @Post("create")
    async create(@Body() data: CreateUserDto): Promise<UserDataDto> {
        const newUser = await this.users.create(data);
        return newUser;
    }

    @ApiOperation({ summary: "批量导入员工信息" })
    @UseInterceptors(FileInterceptor("file", { dest: "./upload" }))
    @Roles(RoleType.admin, RoleType.manager)
    @ActionLog("用户管理", "导入模板")
    @Post("import")
    async importStaffs(@UploadedFile() file: Express.Multer.File) {
        await this.users.importFromExcel(file.path);
        return CommonRespDto.succ();
    }

    @ApiOperation({ summary: "删除用户", description: "删除用户接口" })
    @ApiResponse({ type: UserDataDto })
    @ApiBody({ type: UsernameDto })
    @Roles(RoleType.admin, RoleType.manager)
    @Post("remove")
    async remove(@Body() data: UsernameDto): Promise<CommonRespDto> {
        await this.users.remove(data);
        return CommonRespDto.succ();
    }

    @ApiOperation({ description: "修改密码" })
    @ApiBody({ type: ChangePasswordDto })
    @ApiResponse({ type: CommonRespDto })
    @Post("change-password")
    async changePassword(@User() user: UserDataDto, @Body() data: ChangePasswordDto): Promise<CommonRespDto> {
        await this.users.changePassword(user, data);
        return CommonRespDto.succ();
    }

    @ApiOperation({ description: "设置初始密码" })
    @ApiBody({ type: ChangePasswordDto })
    @ApiResponse({ type: CommonRespDto })
    @Post("init-password")
    async initPassword(@User() user: UserDataDto, @Body() data: ChangePasswordDto): Promise<CommonRespDto> {
        await this.users.initPassword(user, data);
        return CommonRespDto.succ();
    }

    @ApiOperation({ description: "获取sm4加密的key和iv" })
    @ApiResponse({ type: CommonRespDto })
    @Get("fetchEncryptionParam")
    async fetchEncryptionParam(@User() user: UserDataDto): Promise<EncryptionParamDto> {
        return await this.users.fetchEncryptionParam(user);
    }

    @ApiOperation({ description: "重置密码" })
    @ApiBody({ type: UsernameDto })
    @ApiResponse({ type: CommonRespDto })
    @Roles(RoleType.admin)
    @Post("reset-password")
    async resetPassword(@Body() data: UsernameDto): Promise<CommonRespDto> {
        await this.users.resetPassword(data);
        return CommonRespDto.succ();
    }

    @ApiOperation({ description: "设置权限" })
    @ApiBody({ type: SetRolesDto })
    @ApiResponse({ type: CommonRespDto })
    @Roles(RoleType.admin, RoleType.manager)
    @Post("set-roles")
    async setRoles(@User() user: UserDataDto, @Body() data: SetRolesDto): Promise<CommonRespDto> {
        await this.users.setRoles(user, data.username, data.roles);
        return CommonRespDto.succ();
    }
}
