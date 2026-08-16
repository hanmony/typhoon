import { Controller, Get, Post, Query, Response, StreamableFile, UploadedFile, UseInterceptors } from "@nestjs/common";
import { FileInterceptor } from "@nestjs/platform-express";
import { ApiBearerAuth, ApiOperation, ApiQuery, ApiResponse, ApiTags } from "@nestjs/swagger";
import { accessoryUploadPath } from "../domain/accessory.constants";
import { AccessoryService } from "../service/accessory.service";
import { CommonRespDto } from "src/common/domain/common.resp.dto";
import { Public } from "src/security/lib/decorator/public.decorator";
import { diskStorage } from "multer";
import { ActionLog } from "src/diagnostics/lib/action.logger.interceptor";

@ApiBearerAuth()
@ApiTags("文件上传")
@Controller("uploadFile")
export class AccessoryController {
    constructor(private readonly accessories: AccessoryService) {}

    /**
     * 上传附件数据，保存在本地upload目录下，最大10M
     * @param file
     * @returns
     */
    @ApiOperation({ summary: "上传附件数据" })
    // @UseInterceptors(
    //     FileInterceptor("file", {
    //         dest: accessoryUploadPath,
    //         storage: diskStorage({
    //             destination: accessoryUploadPath,
    //             filename: (req, file, cb) => {
    //                 cb(null, file.originalname);
    //             },
    //         }),
    //     }),
    // )
    @Post("upload")
    @ActionLog("上传模块", "上传文件")
    @UseInterceptors(
        FileInterceptor("file", {
            storage: diskStorage({
                destination: "./upload", // 指定目录路径
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
    @ApiResponse({ type: CommonRespDto })
    async upload(
        // @UploadedFile(
        //     new ParseFilePipeBuilder()
        //         .addMaxSizeValidator({
        //             maxSize: 10 * 1024 ** 2,
        //         })
        //         .build({
        //             errorHttpStatusCode: HttpStatus.UNPROCESSABLE_ENTITY,
        //         }),
        //     new FileNameEncodePipe(),
        // )
        // file: Express.Multer.File,
        @UploadedFile() file: Express.Multer.File,
    ): Promise<CommonRespDto> {
        const encodedString = encodeURIComponent(file.filename);
        // const url = "http://localhost:3000/uploadFile/download?name=" + encodedString;
        const url = "/uploadFile/download?name=" + encodedString;
        return CommonRespDto.succ(url);
    }

    @ApiOperation({ summary: "下载附件" })
    @ApiQuery({ name: "name", type: String, description: "附件文件名" })
    @Public()
    @Get("download")
    async downloadAccessory(
        @Query("name") name: string,
        @Response({ passthrough: true }) res,
    ): Promise<StreamableFile> {
        // const meta = await this.accessories.getMeta(name);
        // const bucketStream = this.accessories.download(name);
        const fileBuffer = await this.accessories.getFileBuff(accessoryUploadPath + "/" + name);
        // 获取文件扩展名
        const extension = name.split(".").pop()?.toLowerCase() || "";

        // 设置 Content-Disposition 为 inline，让浏览器决定是否预览
        res.set({
            "Content-Disposition": `inline; filename="${encodeURIComponent(name)}"`,
            "Content-Type": this.getMimeTypeByExtension(extension), // 设置正确的 Content-Type
        });

        return new StreamableFile(fileBuffer);
    }

    private getMimeTypeByExtension(extension: string): string {
        const mimeTypes: Record<string, string> = {
            // 图片
            jpg: "image/jpeg",
            jpeg: "image/jpeg",
            png: "image/png",
            gif: "image/gif",
            bmp: "image/bmp",
            webp: "image/webp",
            svg: "image/svg+xml",
            ico: "image/x-icon",
            // 文档
            pdf: "application/pdf",
            doc: "application/msword",
            docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
            xls: "application/vnd.ms-excel",
            xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            ppt: "application/vnd.ms-powerpoint",
            pptx: "application/vnd.openxmlformats-officedocument.presentationml.presentation",
            // 文本
            txt: "text/plain",
            csv: "text/csv",
            xml: "application/xml",
            json: "application/json",
            html: "text/html",
            htm: "text/html",
            css: "text/css",
            js: "application/javascript",
            // 音频
            mp3: "audio/mpeg",
            wav: "audio/wav",
            ogg: "audio/ogg",
            // 视频
            mp4: "video/mp4",
            webm: "video/webm",
            avi: "video/x-msvideo",
            mov: "video/quicktime",
            // 压缩文件
            zip: "application/zip",
            rar: "application/x-rar-compressed",
            "7z": "application/x-7z-compressed",
            // 其他
            exe: "application/x-msdownload",
            iso: "application/x-iso9660-image",
        };

        return mimeTypes[extension] || "application/octet-stream";
    }
}
