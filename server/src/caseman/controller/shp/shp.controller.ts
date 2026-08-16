import {
    Body,
    Controller,
    Get,
    Post,
    Query,
    StreamableFile,
    UploadedFile,
    UseInterceptors,
    Response,
} from "@nestjs/common";
import { FileInterceptor } from "@nestjs/platform-express";
import { ApiBearerAuth, ApiBody, ApiOperation, ApiQuery, ApiResponse, ApiTags } from "@nestjs/swagger";
import { diskStorage } from "multer";
import { ShpDto } from "src/caseman/domain/dto/shp.dto";
import { ShpListDto } from "src/caseman/domain/dto/shp.list.dto";
import { ShpSearchDto } from "src/caseman/domain/dto/shp.search.dto";
import { ShpService } from "src/caseman/service/shp/shp.service";
import { CommonRespDto } from "src/common/domain/common.resp.dto";
import { ActionLog } from "src/diagnostics/lib/action.logger.interceptor";
import { RoleType } from "src/security/domain/role.type";
import { Public } from "src/security/lib/decorator/public.decorator";
import { Roles } from "src/security/lib/decorator/roles.decorator";
import { User } from "src/security/lib/decorator/user.decorator";

@ApiBearerAuth()
@ApiTags("文件管理")
@Controller("shp")
export class ShpController {
    constructor(private readonly shp: ShpService) {}

    @ApiOperation({ summary: "文件列表" })
    @ApiResponse({ type: ShpListDto })
    @ApiBody({ type: ShpSearchDto })
    @Roles(RoleType.admin, RoleType.manager, RoleType.editor)
    @Post("list")
    async list(@User() staffId: string, @Body() body: ShpSearchDto): Promise<ShpListDto> {
        return await this.shp.list(staffId, body);
    }

    @ApiOperation({ summary: "导入文件信息" })
    @UseInterceptors(
        FileInterceptor("file", {
            storage: diskStorage({
                destination: "./upload/shp", // 指定目录路径
                filename: (req, file, callback) => {
                    // 处理中文文件名
                    const originalname = Buffer.from(file.originalname, "latin1").toString("utf8");

                    // 安全处理文件名
                    const safeFilename = originalname.replace(/[^a-zA-Z0-9\u4e00-\u9fa5.-]/g, "_");

                    callback(null, safeFilename);
                },
            }),
        }),
    )
    @ApiResponse({ status: 200, type: CommonRespDto })
    @Roles(RoleType.admin, RoleType.manager, RoleType.editor)
    @ActionLog("文件管理", "导入文件信息")
    @Post("import")
    async importCase(@UploadedFile() file: Express.Multer.File): Promise<ShpDto> {
        return await this.shp.importShp(file);
        // return CommonRespDto.succ(ShpDto);
    }

    @ApiOperation({ description: "下载事件附件" })
    @ApiQuery({ name: "filename", description: "文件名" })
    @Public()
    @ApiResponse({ type: StreamableFile })
    @Get("download-file")
    async downloadAccessory(
        @Query("filename") filename: string,
        @Response({ passthrough: true }) res,
    ): Promise<StreamableFile> {
        const file = await this.shp.downloadShpFile(filename);
        res.set({
            "Accept-Ranges": "bytes",
        });
        return file;
    }

    @ApiOperation({ description: "文件删除" })
    @ActionLog("文件管理", "删除")
    @Get("remove")
    @ApiResponse({ type: CommonRespDto })
    async remove(@Query("id") id: string): Promise<CommonRespDto> {
        await this.shp.remove(id);
        return CommonRespDto.succ();
    }
}
