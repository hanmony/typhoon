import { Body, Controller, Post } from "@nestjs/common";
import { ApiBearerAuth, ApiBody, ApiOperation, ApiResponse, ApiTags } from "@nestjs/swagger";
import { LogService } from "../service/log.service";
import { LogSearchDto } from "../domain/dto/log.search.dto";
import { LogListDto } from "../domain/dto/log.list.dto";
import { User } from "src/security/lib/decorator/user.decorator";
import { RoleType } from "src/security/domain/role.type";
import { Roles } from "src/security/lib/decorator/roles.decorator";

@ApiBearerAuth()
@ApiTags("log")
@Controller("log")
export class LogController {
    constructor(private readonly logs: LogService) {}

    @ApiOperation({ summary: "日志列表" })
    @ApiResponse({ type: LogListDto })
    @ApiBody({ type: LogSearchDto })
    @Roles(RoleType.admin, RoleType.manager)
    @Post("list")
    async list(@User() staffId: string, @Body() body: LogSearchDto): Promise<LogListDto> {
        return await this.logs.list(staffId, body);
    }
}
