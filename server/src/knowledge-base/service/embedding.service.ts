import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { HttpService } from "@nestjs/axios";
import { lastValueFrom, map, catchError } from "rxjs";

@Injectable()
export class EmbeddingService {
    private readonly logger = new Logger(EmbeddingService.name);
    private readonly baseUrl: string;
    private readonly apiKey: string;
    private readonly model: string;
    private readonly dimension: number;
    private readonly batchSize = 25;

    constructor(
        private readonly config: ConfigService,
        private readonly http: HttpService,
    ) {
        this.baseUrl = config.get("EMBEDDING_BASE_URL");
        this.apiKey = config.get("EMBEDDING_API_KEY");
        this.model = config.get("EMBEDDING_MODEL", "text-embedding-v3");
        this.dimension = parseInt(config.get("EMBEDDING_DIMENSION", "1024"), 10);
    }

    async embedQuery(query: string): Promise<number[]> {
        const results = await this.embedTexts([query]);
        return results[0];
    }

    async embedTexts(texts: string[]): Promise<number[][]> {
        const allEmbeddings: number[][] = [];

        for (let i = 0; i < texts.length; i += this.batchSize) {
            const batch = texts.slice(i, i + this.batchSize);
            const embeddings = await this.callApiWithRetry(batch, 2);
            allEmbeddings.push(...embeddings);
        }

        return allEmbeddings;
    }

    private async callApiWithRetry(texts: string[], retries: number): Promise<number[][]> {
        for (let attempt = 0; attempt <= retries; attempt++) {
            try {
                return await this.callApi(texts);
            } catch (err) {
                if (attempt === retries) throw err;
                const delay = Math.pow(2, attempt) * 1000;
                this.logger.warn(`Embedding API retry ${attempt + 1}/${retries}, waiting ${delay}ms`);
                await new Promise(r => setTimeout(r, delay));
            }
        }
        throw new Error("Embedding API failed after all retries");
    }

    private async callApi(texts: string[]): Promise<number[][]> {
        const url = `${this.baseUrl}/embeddings`;
        const body = {
            model: this.model,
            input: texts,
            dimensions: this.dimension,
        };

        const ob = this.http
            .post(url, body, {
                headers: {
                    Authorization: `Bearer ${this.apiKey}`,
                    "Content-Type": "application/json",
                },
                timeout: 30000,
            })
            .pipe(
                map(resp => {
                    const data = resp.data;
                    return data.data.map((item: any) => item.embedding as number[]);
                }),
                catchError(err => {
                    this.logger.error(`Embedding API error: ${err.message}`);
                    throw err;
                }),
            );

        return lastValueFrom(ob);
    }
}
