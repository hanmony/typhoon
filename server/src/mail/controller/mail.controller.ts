import { Body, Controller, Get, Query } from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from "@nestjs/swagger";
import { MailService } from "../service/mail.service";
import { CommonRespDto } from "src/common/domain/common.resp.dto";
import { MailTyphoonCreateDto } from "../domain/mail.typhoon.create.dto";
import { User } from "src/security/lib/decorator/user.decorator";
import { UserDataDto } from "src/userman/domain/user.data.dto";

@ApiBearerAuth()
@ApiTags("邮件模块")
@Controller("mail")
export class MailController {
    constructor(private readonly mail: MailService) {}

    // @ApiOperation({ description: "读取邮件" })
    // @Get("read")
    // @ApiResponse({ status: 200 })
    // async read(@Query("id") id: string): Promise<CommonRespDto> {
    //     await this.mail.read(id);
    //     return CommonRespDto.succ();
    // }

    @ApiOperation({ description: "获取台风邮件列表" })
    @Get("typhoonList")
    @ApiResponse({ status: 200 })
    async typhoonList(@User() user: UserDataDto): Promise<CommonRespDto> {
        await this.mail.typhoonList(user);
        return CommonRespDto.succ();
    }

    @ApiOperation({ description: "发送台风邮件" })
    @Get("typhoonSend")
    @ApiResponse({ status: 200 })
    async typhoonSend(@User() user: UserDataDto, @Body() data: MailTyphoonCreateDto): Promise<CommonRespDto> {
        await this.mail.typhoonSend(user, data);
        return CommonRespDto.succ();
    }
}
