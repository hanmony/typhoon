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
    /** 阶段 F：查询向量 LRU 缓存（Map 插入序即最近使用序；超容量淘汰最旧） */
    private readonly cache = new Map<string, number[]>();
    private readonly cacheSize: number;

    constructor(
        private readonly config: ConfigService,
        private readonly http: HttpService,
    ) {
        this.baseUrl = config.get("EMBEDDING_BASE_URL");
        this.apiKey = config.get("EMBEDDING_API_KEY");
        this.model = config.get("EMBEDDING_MODEL", "text-embedding-v3");
        this.dimension = parseInt(config.get("EMBEDDING_DIMENSION", "1024"), 10);
        // 缓存容量：非正数/非法值一律按 0 处理（禁用缓存，行为与未加缓存完全一致）
        const rawSize = parseInt(config.get("EMBEDDING_CACHE_SIZE", "256"), 10);
        this.cacheSize = Number.isFinite(rawSize) && rawSize > 0 ? rawSize : 0;
    }

    async embedQuery(query: string): Promise<number[]> {
        // 阶段 F 性能优化：查询向量 LRU 缓存。
        // 指挥室高频重复提问（如"台风期间线路停运的判定条件"）可跳过远程 embedding
        // （实测 Qwen3-Embedding-8B 远程调用 7~10s/次）。缓存键为规范化问题文本，
        // 命中时返回同一向量 → 检索语义与未缓存时完全一致，不影响精度/召回。
        // LRU 语义：命中即刷新最近使用位置（删除后重插，保持插入序=最近使用序）。
        const key = query.trim();
        if (this.cacheSize <= 0) {
            const results = await this.embedTexts([key]);
            return results[0];
        }

        const hit = this.cache.get(key);
        if (hit) {
            this.cache.delete(key);
            this.cache.set(key, hit);
            return hit;
        }

        const results = await this.embedTexts([key]);
        const vector = results[0];

        if (this.cache.size >= this.cacheSize) {
            const oldest = this.cache.keys().next().value;
            if (oldest !== undefined) this.cache.delete(oldest);
        }
        this.cache.set(key, vector);
        return vector;
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
