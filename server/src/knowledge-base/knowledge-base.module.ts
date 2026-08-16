import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { HttpModule } from "@nestjs/axios";
import { CommonModule } from "src/common/common.module";
import { DatabaseModule } from "src/database/database.module";
import { LlmModule } from "src/llm/llm.module";

import { KbDocumentController } from "./controller/kb-document.controller";
import { KbQueryController } from "./controller/kb-query.controller";

import { EmbeddingService } from "./service/embedding.service";
import { QdrantService } from "./service/qdrant.service";
import { DocumentService } from "./service/document.service";
import { ParserService } from "./service/parser.service";
import { ChunkService } from "./service/chunk.service";
import { RagService } from "./service/rag.service";
import { MetadataService } from "./service/metadata.service";
import { KbCatalogCache } from "./service/catalog-cache.service";

@Module({
    imports: [CommonModule, DatabaseModule, ConfigModule, HttpModule, LlmModule],
    controllers: [KbDocumentController, KbQueryController],
    providers: [
        EmbeddingService,
        QdrantService,
        DocumentService,
        ParserService,
        ChunkService,
        RagService,
        MetadataService,
        KbCatalogCache,
    ],
    exports: [RagService, KbCatalogCache],
})
export class KnowledgeBaseModule {}
