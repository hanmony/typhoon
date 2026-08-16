import {
    Body,
    Controller,
    Delete,
    Get,
    HttpStatus,
    ParseFilePipeBuilder,
    Post,
    Query,
    Response,
    StreamableFile,
    UploadedFile,
    UseInterceptors,
} from "@nestjs/common";
import { FileInterceptor } from "@nestjs/platform-express";
import { ApiBearerAuth, ApiBody, ApiOperation, ApiQuery, ApiResponse, ApiTags } from "@nestjs/swagger";
import { CaseDocMeta } from "src/caseman/domain/case.doc.meta";
import { StartEditDto } from "src/caseman/domain/dto/start.edit.dto";
import { UpdatePropertyDto } from "src/caseman/domain/dto/update.property.dto";
import { CaseEditorService } from "src/caseman/service/case.editor/case.editor.service";
import { CommonRespDto } from "src/common/domain/common.resp.dto";
import { FileNameEncodePipe } from "src/common/lib/filename.encode.pipe";
import { ActionAccessoryEntity } from "src/database/entity/action.schema";
import { CaseDocument } from "src/database/entity/case.schema";
import { ActionLog } from "src/diagnostics/lib/action.logger.interceptor";
import { Failed } from "src/diagnostics/lib/failed";
import { RoleType } from "src/security/domain/role.type";
import { Public } from "src/security/lib/decorator/public.decorator";
import { Roles } from "src/security/lib/decorator/roles.decorator";

@ApiBearerAuth()
@ApiTags("案例编辑")
@Controller("manager/editor")
export class CaseEditorController {
    constructor(private readonly editor: CaseEditorService) {}

    @ApiOperation({ description: "开始编辑" })
    @ApiBody({ type: StartEditDto })
    @Roles(RoleType.admin, RoleType.manager, RoleType.editor)
    @ActionLog("案例编辑", "开始编辑")
    @Post("start-edit")
    async startEdit(@Body() data: StartEditDto): Promise<CaseDocument> {
        const doc = await this.editor.startEdit(data.id);
        return doc;
    }

    @ApiOperation({ description: "结束编辑" })
    @ApiBody({ type: StartEditDto })
    @Roles(RoleType.admin, RoleType.manager, RoleType.editor)
    @ActionLog("案例编辑", "结束编辑")
    @Post("finish-edit")
    async finishEdit(@Body() data: StartEditDto): Promise<CaseDocument> {
        const doc = await this.editor.finishEdit(data.id);
        return doc;
    }

    @ApiOperation({ description: "删除" })
    @ApiBody({ type: StartEditDto })
    @Roles(RoleType.admin, RoleType.manager)
    @ActionLog("案例编辑", "删除")
    @Post("delete")
    async deleteCase(@Body() data: StartEditDto): Promise<CommonRespDto> {
        await this.editor.deleteCase(data.id, false);
        return CommonRespDto.succ();
    }

    @ApiOperation({ description: "下架" })
    @ApiBody({ type: StartEditDto })
    @Roles(RoleType.admin, RoleType.manager)
    @ActionLog("案例编辑", "下架")
    @Post("deactive")
    async deactiveCase(@Body() data: StartEditDto): Promise<CaseDocument> {
        const doc = await this.editor.deactiveCase(data.id);
        return doc;
    }

    @ApiOperation({ description: "上架" })
    @ApiBody({ type: StartEditDto })
    @Roles(RoleType.admin, RoleType.manager)
    @ActionLog("案例编辑", "上架")
    @Post("active")
    async activeCase(@Body() data: StartEditDto): Promise<CaseDocument> {
        const doc = await this.editor.activeCase(data.id);
        return doc;
    }

    @ApiOperation({ summary: "更新案例属性" })
    @ApiBody({ type: UpdatePropertyDto })
    @Roles(RoleType.admin, RoleType.manager, RoleType.editor)
    @ActionLog("案例编辑", "更新案例属性")
    @Post("update-case-property")
    @ApiResponse({ status: 200, type: CommonRespDto })
    async updateCaseProperty(@Body() args: UpdatePropertyDto): Promise<CommonRespDto> {
        await this.editor.updateConfigProperty(args.id, args.property, args.value);
        return CommonRespDto.succ();
    }

    @ApiOperation({ summary: "更新事件属性" })
    @ApiBody({ type: UpdatePropertyDto })
    @Roles(RoleType.admin, RoleType.manager, RoleType.editor)
    @ActionLog("案例编辑", "更新事件属性")
    @Post("update-action-property")
    @ApiResponse({ status: 200, type: CommonRespDto })
    async updateActionProperty(@Body() args: UpdatePropertyDto): Promise<CommonRespDto> {
        await this.editor.updateActionProperty(args.id, args.property, args.value);
        return CommonRespDto.succ();
    }

    @ApiOperation({ description: "获取台风总结报告" })
    @ApiQuery({ name: "case", description: "案例ID" })
    @Get("get-docs")
    async getDocs(@Query("case") caseId: string): Promise<CaseDocMeta[]> {
        return this.editor.getDocMetas(caseId);
    }

    @ApiOperation({ description: "下载台风总结报告" })
    @ApiQuery({ name: "case", description: "案例ID" })
    @ApiQuery({ name: "filename", description: "文件名" })
    @Public()
    @ApiResponse({ type: StreamableFile })
    @Get("download-doc")
    async downloadDoc(@Query("case") caseId: string, @Query("filename") filename: string): Promise<StreamableFile> {
        return this.editor.downloadDoc(caseId, filename);
    }

    @ApiOperation({ description: "下载第一份台风总结报告" })
    @ApiQuery({ name: "case", description: "案例ID" })
    @Public()
    @ApiResponse({ type: StreamableFile })
    @Get("download-one-doc")
    async downloadOneDoc(@Query("case") caseId: string): Promise<StreamableFile> {
        const metas = await this.editor.getDocMetas(caseId);
        Failed.check(metas && metas.length > 0, "找不到台风总结报告");
        return this.editor.downloadDoc(caseId, metas[0].filename);
    }

    @ApiOperation({ description: "获取一个台风总结报告" })
    @ApiQuery({ name: "case", description: "案例ID" })
    @Get("get-one-doc")
    async getOneDoc(@Query("case") caseId: string): Promise<CaseDocMeta> {
        const items = await this.editor.getDocMetas(caseId);
        Failed.check(items && items.length > 0, "找不到台风总结报告");
        return items[0];
    }

    @ApiOperation({ description: "导入台风总结报告" })
    @UseInterceptors(FileInterceptor("file", { dest: "./upload" }))
    @ApiQuery({ name: "case", description: "案例ID" })
    @ApiResponse({ type: [CaseDocMeta] })
    @Roles(RoleType.admin, RoleType.manager, RoleType.editor)
    @ActionLog("案例编辑", "导入台风总结报告")
    @Post("import-doc")
    async importDoc(
        @Query("case") caseId: string,
        @UploadedFile(
            new ParseFilePipeBuilder()
                .addMaxSizeValidator({
                    // maxSize: 10 * 1024 ** 2,
                    maxSize: 500 * 1024 ** 2,
                })
                .build({
                    errorHttpStatusCode: HttpStatus.UNPROCESSABLE_ENTITY,
                }),
            new FileNameEncodePipe(),
        )
        file: Express.Multer.File,
    ): Promise<CaseDocMeta[]> {
        await this.editor.uploadDoc(caseId, file);
        return this.editor.getDocMetas(caseId);
    }

    @ApiOperation({ description: "删除台风总结报告" })
    @Roles(RoleType.admin, RoleType.manager, RoleType.editor)
    @ApiResponse({ type: [CaseDocMeta] })
    @ApiQuery({ name: "case", description: "案例ID" })
    @ApiQuery({ name: "filename", description: "文件名" })
    @ActionLog("案例编辑", "删除台风总结报告")
    @Delete("delete-doc")
    async deleteDoc(@Query("case") caseId: string, @Query("filename") filename: string): Promise<CaseDocMeta[]> {
        await this.editor.deleteDoc(caseId, filename);
        return this.editor.getDocMetas(caseId);
    }

    @ApiOperation({ description: "上传事件附件" })
    @UseInterceptors(FileInterceptor("file", { dest: "./upload" }))
    @ApiQuery({ name: "case", description: "案例ID" })
    @ApiQuery({ name: "action", description: "事件ID" })
    @ApiResponse({ type: [ActionAccessoryEntity] })
    @Roles(RoleType.admin, RoleType.manager, RoleType.editor)
    @ActionLog("案例编辑", "上传事件附件")
    @Post("import-accessory")
    async importAccessory(
        @Query("case") caseId: string,
        @Query("action") actionId: string,
        @UploadedFile(
            new ParseFilePipeBuilder()
                .addMaxSizeValidator({
                    maxSize: 500 * 1024 ** 2,
                })
                .build({
                    errorHttpStatusCode: HttpStatus.UNPROCESSABLE_ENTITY,
                }),
            new FileNameEncodePipe(),
        )
        file: Express.Multer.File,
    ): Promise<ActionAccessoryEntity[]> {
        return await this.editor.uploadAccessory(caseId, actionId, file);
    }

    @ApiOperation({ description: "删除事件附件" })
    @ApiQuery({ name: "action", description: "事件ID" })
    @ApiQuery({ name: "filename", description: "附件ID" })
    @ApiResponse({ type: [ActionAccessoryEntity] })
    @Roles(RoleType.admin, RoleType.manager, RoleType.editor)
    @ActionLog("案例编辑", "删除事件附件")
    @Delete("delete-accessory")
    async deleteAccessory(
        @Query("action") action: string,
        @Query("filename") filename: string,
    ): Promise<ActionAccessoryEntity[]> {
        return await this.editor.deleteAccessory(action, filename);
    }

    @ApiOperation({ description: "下载事件附件" })
    @ApiQuery({ name: "filename", description: "文件名" })
    @Public()
    @ApiResponse({ type: StreamableFile })
    @Get("download-accessory")
    async downloadAccessory(
        @Query("filename") filename: string,
        @Response({ passthrough: true }) res,
    ): Promise<StreamableFile> {
        const file = await this.editor.downloadAccessory(filename);
        res.set({
            "Accept-Ranges": "bytes",
        });
        return file;
    }
}
