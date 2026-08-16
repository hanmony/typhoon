import { Controller, Post, Request, UseGuards } from "@nestjs/common";
import { ApiBody, ApiOperation, ApiResponse } from "@nestjs/swagger";
import { CommonRespDto } from "src/common/domain/common.resp.dto";
import { isNullOrEmpty } from "src/common/lib/string.helper";
import { RepoService } from "src/database/service/repo/repo.service";
import { Failed } from "src/diagnostics/lib/failed";
import { AuthLoginDto } from "src/security/domain/dto/auth.login.dto";
import { AuthLoginRespDto } from "src/security/domain/dto/auth.login.resp.dto";
import { Public } from "src/security/lib/decorator/public.decorator";
import { LocalAuthGuard } from "src/security/lib/passport/local.authguard";
import { X5AuthGuard } from "src/security/lib/passport/x5.authguard";
import { AuthService } from "src/security/service/auth/auth.service";

@Controller("auth")
export class AuthController {
    constructor(
        private readonly auth: AuthService,
        private readonly repo: RepoService,
    ) {}

    @ApiOperation({ summary: "用户登录", description: "用户登录接口" })
    @ApiResponse({ type: AuthLoginRespDto })
    @ApiBody({ type: AuthLoginDto })
    @Public()
    @UseGuards(LocalAuthGuard)
    @Post("login")
    async login(@Request() req): Promise<AuthLoginRespDto> {
        const staff = await this.repo.staffs.findOne({ username: req.user.id });
        Failed.check(staff, "用户信息获取失败");
        const token = await this.auth.sign(req.user);
        return { token, name: req.user.name, roles: req.user.roles, password: isNullOrEmpty(staff.password) };
    }

    @ApiOperation({ summary: "X5用户登录", description: "X5用户登录接口" })
    @ApiResponse({ type: AuthLoginRespDto })
    @Public()
    @UseGuards(X5AuthGuard)
    @Post("login-x5")
    async loginX5(@Request() req): Promise<AuthLoginRespDto> {
        const staff = await this.repo.staffs.findOne({ username: req.user.id });
        Failed.check(staff, "用户信息获取失败");
        const token = await this.auth.sign(req.user);
        return { token, name: req.user.name, roles: req.user.roles, password: isNullOrEmpty(staff.password) };
    }

    @ApiOperation({ summary: "用户登录", description: "用户登录接口" })
    @ApiResponse({ type: CommonRespDto })
    @Post("logout")
    async logout(): Promise<CommonRespDto> {
        return CommonRespDto.succ();
    }
}
