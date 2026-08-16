import { Injectable, Logger, OnModuleInit } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { QdrantClient } from "@qdrant/js-client-rest";

export interface QdrantSearchResult {
    id: string;
    score: number;
    content: string;
    documentId: string;
    documentName: string;
    chunkIndex: number;
}

@Injectable()
export class QdrantService implements OnModuleInit {
    private readonly logger = new Logger(QdrantService.name);
    private client: QdrantClient;
    private readonly collectionName: string;

    constructor(private readonly config: ConfigService) {
        this.client = new QdrantClient({
            url: config.get("QDRANT_URL", "http://localhost:6333"),
        });
        this.collectionName = config.get("QDRANT_COLLECTION_NAME", "knowledge_base");
    }

    async onModuleInit() {
        await this.ensureCollection();
    }

    async ensureCollection() {
        try {
            await this.client.getCollection(this.collectionName);
            this.logger.log(`Qdrant collection "${this.collectionName}" already exists`);
        } catch {
            try {
                const dimension = parseInt(this.config.get("EMBEDDING_DIMENSION", "1024"), 10);
                await this.client.createCollection(this.collectionName, {
                    vectors: { size: dimension, distance: "Cosine" },
                });
                this.logger.log(`Created Qdrant collection "${this.collectionName}" (dim=${dimension})`);
            } catch (err) {
                this.logger.warn(
                    `Qdrant unavailable (${(err as Error).message}), vector search will not work until Qdrant is started`,
                );
            }
        }
    }

    async upsertPoints(params: { ids: string[]; vectors: number[][]; payloads: Record<string, any>[] }) {
        const points = params.ids.map((id, i) => ({
            id,
            vector: params.vectors[i],
            payload: params.payloads[i],
        }));

        await this.client.upsert(this.collectionName, { wait: true, points });
    }

    async search(queryVector: number[], limit: number = 5, category?: string): Promise<QdrantSearchResult[]> {
        const searchParams: any = {
            vector: queryVector,
            limit,
            with_payload: true,
        };
        if (category) {
            searchParams.filter = {
                must: [{ key: "category", match: { value: category } }],
            };
        }
        const results = await this.client.search(this.collectionName, searchParams);

        return results.map(r => ({
            id: r.id as string,
            score: r.score,
            content: (r.payload?.content as string) || "",
            documentId: (r.payload?.documentId as string) || "",
            documentName: (r.payload?.documentName as string) || "",
            chunkIndex: (r.payload?.chunkIndex as number) || 0,
        }));
    }

    async deleteByDocumentId(documentId: string) {
        await this.client.delete(this.collectionName, {
            filter: {
                must: [{ key: "documentId", match: { value: documentId } }],
            },
        });
    }

    async updatePayloadByDocumentId(documentId: string, payload: Record<string, any>) {
        await this.client.setPayload(this.collectionName, {
            filter: {
                must: [{ key: "documentId", match: { value: documentId } }],
            },
            payload,
        });
    }
}
