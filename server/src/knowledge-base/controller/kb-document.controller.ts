import {
    Body,
    Controller,
    Delete,
    Get,
    Logger,
    Param,
    Patch,
    Post,
    Query,
    UploadedFile,
    UseInterceptors,
} from "@nestjs/common";
import { FileInterceptor } from "@nestjs/platform-express";
import { diskStorage } from "multer";
import { ApiBearerAuth, ApiBody, ApiOperation, ApiResponse, ApiTags } from "@nestjs/swagger";
import { CommonRespDto } from "src/common/domain/common.resp.dto";
import { ActionLog } from "src/diagnostics/lib/action.logger.interceptor";
import { RoleType } from "src/security/domain/role.type";
import { Roles } from "src/security/lib/decorator/roles.decorator";
import { DocumentService } from "../service/document.service";
import { ChunkService } from "../service/chunk.service";
import { MetadataService } from "../service/metadata.service";
import { KbCatalogCache } from "../service/catalog-cache.service";
import { DocumentSearchDto } from "../domain/dto/document-search.dto";
import { ProcessDocumentDto } from "../domain/dto/process-document.dto";
import { SaveChunkConfigDto } from "../domain/dto/save-chunk-config.dto";
import { UpdateDocumentDto } from "../domain/dto/update-document.dto";
import { FailedItemDto, GenerateAllMetadataResponseDto } from "../domain/dto/generate-all-metadata.dto";
import * as path from "path";
import * as fs from "fs";

const UPLOAD_DIR = process.env.KB_UPLOAD_DIR || "./upload/knowledge-base";

@ApiBearerAuth()
@ApiTags("知识库管理")
@Controller("kb/document")
export class KbDocumentController {
    private readonly logger = new Logger(KbDocumentController.name);

    constructor(
        private readonly docService: DocumentService,
        private readonly metadataService: MetadataService,
        private readonly catalogCache: KbCatalogCache,
    ) {}

    @ApiOperation({ summary: "上传文档" })
    @ApiResponse({ type: CommonRespDto })
    @Roles(RoleType.admin, RoleType.manager)
    @ActionLog("知识库", "上传文档")
    @Post("upload")
    @UseInterceptors(
        FileInterceptor("file", {
            storage: diskStorage({
                destination: (_req, _file, cb) => {
                    fs.mkdirSync(UPLOAD_DIR, { recursive: true });
                    cb(null, UPLOAD_DIR);
                },
                filename: (_req, file, cb) => {
                    const ext = path.extname(file.originalname);
                    const name = `${Date.now()}-${Math.random().toString(36).slice(2)}${ext}`;
                    cb(null, name);
                },
            }),
        }),
    )
    async upload(
        @UploadedFile() file: Express.Multer.File,
        @Body("category") category?: string,
    ): Promise<CommonRespDto> {
        await this.docService.upload(file, category);
        return CommonRespDto.succ();
    }

    @ApiOperation({ summary: "触发文档解析入库" })
    @ApiResponse({ type: CommonRespDto })
    @Roles(RoleType.admin, RoleType.manager)
    @ActionLog("知识库", "处理文档")
    @Post("process")
    async process(@Body() dto: ProcessDocumentDto): Promise<CommonRespDto> {
        await this.docService.processDocument(dto.documentId, {
            strategy: dto.strategy,
            chunkSize: dto.chunkSize,
            overlap: dto.overlap,
        });
        return CommonRespDto.succ();
    }

    @ApiOperation({ summary: "保存分段配置（不触发处理）" })
    @ApiResponse({ type: CommonRespDto })
    @Roles(RoleType.admin, RoleType.manager)
    @ActionLog("知识库", "保存分段配置")
    @Patch(":id/chunk-config")
    async saveChunkConfig(@Param("id") id: string, @Body() dto: SaveChunkConfigDto): Promise<CommonRespDto> {
        const doc = await this.docService.getDocument(id);
        if (!doc) throw new Error(`Document not found: ${id}`);
        const resolved = ChunkService.resolveConfig(doc.category || "other", dto.strategy, dto.chunkSize, dto.overlap);
        await this.docService.saveChunkConfig(id, resolved);
        return CommonRespDto.succ();
    }

    @ApiOperation({ summary: "文档列表" })
    @Post("list")
    async list(@Body() filter: DocumentSearchDto) {
        return this.docService.listDocuments(filter);
    }

    @ApiOperation({ summary: "文档详情" })
    @Get("detail")
    async detail(@Query("id") id: string) {
        return this.docService.getDocument(id);
    }

    @ApiOperation({ summary: "删除文档" })
    @ApiResponse({ type: CommonRespDto })
    @Roles(RoleType.admin, RoleType.manager)
    @ActionLog("知识库", "删除文档")
    @Delete(":id")
    async delete(@Param("id") id: string): Promise<CommonRespDto> {
        await this.docService.deleteDocument(id);
        return CommonRespDto.succ();
    }

    @ApiOperation({ summary: "更新文档（manualTags + summary）" })
    @ApiResponse({ type: CommonRespDto })
    @Roles(RoleType.admin, RoleType.manager)
    @ActionLog("知识库", "更新文档")
    @Patch(":id")
    async updateDocument(@Param("id") id: string, @Body() dto: UpdateDocumentDto): Promise<CommonRespDto> {
        await this.docService.updateDocument(id, dto);
        return CommonRespDto.succ();
    }

    @ApiOperation({ summary: "修改文档分类" })
    @ApiBody({
        schema: {
            properties: {
                category: { type: "string", enum: ["typhoon_case", "regulation", "emergency_plan", "other"] },
            },
        },
    })
    @ApiResponse({ type: CommonRespDto })
    @Roles(RoleType.admin, RoleType.manager)
    @ActionLog("知识库", "修改分类")
    @Patch(":id/category")
    async updateCategory(@Param("id") id: string, @Body("category") category: string): Promise<CommonRespDto> {
        await this.docService.updateCategory(id, category as any);
        return CommonRespDto.succ();
    }

    @ApiOperation({ summary: "生成单个文档的 metadata（autoTags + summary）" })
    @ApiResponse({ type: CommonRespDto })
    @Roles(RoleType.admin, RoleType.manager)
    @ActionLog("知识库", "生成文档 metadata")
    @Post(":id/metadata")
    async generateMetadata(@Param("id") id: string) {
        const doc = await this.docService.getDocument(id);
        if (!doc) return CommonRespDto.failed(404, `Document not found: ${id}`);
        // 不再 try/catch：enrichDocument 失败时让 NestJS 走默认异常处理 → 4xx + message
        await this.metadataService.enrichDocument(id);
        await this.catalogCache.update(id);
        const updated = await this.docService.getDocument(id);
        return updated;
    }

    @ApiOperation({ summary: "批量生成缺少 metadata 的文档" })
    @ApiResponse({ type: GenerateAllMetadataResponseDto })
    @Roles(RoleType.admin, RoleType.manager)
    @ActionLog("知识库", "批量生成 metadata")
    @Post("generate-metadata")
    async generateAllMetadata(): Promise<GenerateAllMetadataResponseDto> {
        const docs = await this.docService.listDocumentsWithoutMetadata();
        let processed = 0;
        const failed: FailedItemDto[] = [];
        for (const doc of docs) {
            try {
                await this.metadataService.enrichDocument(doc._id.toString());
                await this.catalogCache.update(doc._id.toString());
                processed++;
            } catch (err) {
                // 收集失败明细，前端可向用户展示
                const message = (err as Error).message || String(err);
                this.logger.warn(
                    `Batch metadata generation failed for document ${doc.name} (${doc._id.toString()}): ${message}`,
                );
                failed.push({ id: doc._id.toString(), name: doc.name, error: message });
            }
        }
        return failed.length > 0 ? { processed, failed } : { processed };
    }
}
