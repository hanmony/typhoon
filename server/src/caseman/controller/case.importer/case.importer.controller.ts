import { Controller, Post, Query, UploadedFile, UseInterceptors } from "@nestjs/common";
import { FileInterceptor } from "@nestjs/platform-express";
import { ApiOperation, ApiQuery, ApiResponse, ApiTags } from "@nestjs/swagger";
import { CaseImportService } from "src/caseman/service/case.import/case.import.service";
import { CommonRespDto } from "src/common/domain/common.resp.dto";
import { ActionLog } from "src/diagnostics/lib/action.logger.interceptor";
import { RoleType } from "src/security/domain/role.type";
import { Roles } from "src/security/lib/decorator/roles.decorator";

@ApiTags("案例管理")
@Controller("manager")
export class CaseImporterController {
    constructor(private readonly importer: CaseImportService) {}

    @ApiOperation({ summary: "导入案例信息" })
    @UseInterceptors(FileInterceptor("file", { dest: "./upload" }))
    @ApiResponse({ status: 200, type: CommonRespDto })
    @Roles(RoleType.admin, RoleType.manager, RoleType.editor)
    @ActionLog("案例编辑", "导入案例信息")
    @Post("import")
    async importCase(@UploadedFile() file: Express.Multer.File) {
        await this.importer.importCase(file.path);
        return CommonRespDto.succ();
    }

    @ApiOperation({ summary: "导入台风路径信息" })
    @UseInterceptors(FileInterceptor("file", { dest: "./upload" }))
    @ApiQuery({ name: "case", description: "案例ID" })
    @ApiResponse({ status: 200, type: CommonRespDto })
    @Roles(RoleType.admin, RoleType.manager, RoleType.editor)
    @ActionLog("案例编辑", "导入台风路径信息")
    @Post("import-path-info")
    async importPathInfo(@Query("case") caseId: string, @UploadedFile() file: Express.Multer.File) {
        await this.importer.importPathInfo(caseId, file.path);
        return CommonRespDto.succ();
    }
}
