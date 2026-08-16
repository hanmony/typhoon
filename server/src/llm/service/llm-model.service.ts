import { Injectable, Logger, OnModuleInit } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { Model } from "mongoose";
import { RepoService } from "src/database/service/repo/repo.service";
import { LlmModelEntity, LlmModelRole } from "src/database/entity/llm-model.schema";
import { CreateLlmModelDto, UpdateLlmModelDto, SetLlmModelRoleDto } from "../domain/llm-model.dto";
import { Failed } from "src/diagnostics/lib/failed";

@Injectable()
export class LlmModelService implements OnModuleInit {
    private readonly logger = new Logger(LlmModelService.name);
    private cache: Map<string, LlmModelEntity> = new Map();

    constructor(
        private readonly repo: RepoService,
        private readonly config: ConfigService,
    ) {}

    private get model(): Model<LlmModelEntity> {
        return this.repo.llmModels;
    }

    async onModuleInit() {
        await this.migrateFromEnvVars();
        await this.reloadCache();
    }

    /** 首次启动：DB 为空 + env vars 存在 → 自动迁移 */
    private async migrateFromEnvVars() {
        const count = await this.model.countDocuments();
        if (count > 0) return;

        const baseUrl = this.config.get("LLM_BASE_URL");
        const apiKey = this.config.get("LLM_API_KEY");
        const modelName = this.config.get("LLM_MODEL", "deepseek-chat");

        if (!baseUrl || !apiKey) return;

        await this.model.create({
            name: modelName,
            baseUrl,
            apiKey,
            model: modelName,
            role: "default-large",
        });

        this.logger.log("从环境变量迁移默认 LLM 模型配置到数据库");
    }

    async reloadCache() {
        const docs = await this.model.find().lean();
        this.cache.clear();
        for (const doc of docs) {
            this.cache.set(doc._id.toString(), doc);
        }
        this.logger.log(`缓存已加载：${this.cache.size} 个模型`);
    }

    private async invalidateCache() {
        // 直接 await 重载，避免缓存清空后短暂空窗导致 LLM 请求报错
        await this.reloadCache();
    }

    /** 按 ID 从缓存获取模型配置 */
    getById(id: string): LlmModelEntity | undefined {
        return this.cache.get(id);
    }

    /** 获取默认大模型配置（供 LlmService 使用） */
    getDefaultLarge(): LlmModelEntity | undefined {
        for (const m of this.cache.values()) {
            if (m.role === "default-large") return m;
        }
        return undefined;
    }

    /** 获取默认小模型配置（供 LlmService 使用），未设置则 fallback 到大模型 */
    getDefaultSmall(): LlmModelEntity | undefined {
        for (const m of this.cache.values()) {
            if (m.role === "default-small") return m;
        }
        return this.getDefaultLarge();
    }

    // ── CRUD ──

    async list() {
        const docs = await this.model.find().sort({ role: -1, createdAt: -1 }).lean();
        return docs.map(d => this.maskApiKey(d));
    }

    async create(dto: CreateLlmModelDto) {
        const doc = await this.model.create(dto);
        await this.invalidateCache();
        return this.maskApiKey(doc.toObject());
    }

    async update(id: string, dto: UpdateLlmModelDto) {
        const update: Record<string, any> = { ...dto };
        // apiKey 留空表示不修改
        if (!update.apiKey) delete update.apiKey;

        const doc = await this.model.findByIdAndUpdate(id, update, { new: true }).lean();
        Failed.check(doc, "模型不存在", 404);
        await this.invalidateCache();
        return this.maskApiKey(doc);
    }

    async delete(id: string) {
        const doc = await this.model.findById(id).lean();
        Failed.check(doc, "模型不存在", 404);
        Failed.check(!doc.role, "默认模型不可删除，请先更换默认设置", 400);
        await this.model.deleteOne({ _id: id });
        await this.invalidateCache();
    }

    async setRole(id: string, dto: SetLlmModelRoleDto) {
        const doc = await this.model.findById(id).lean();
        Failed.check(doc, "模型不存在", 404);

        // 清除同 role 的旧默认
        await this.model.updateMany({ role: dto.role }, { $set: { role: null } });
        // 设新默认
        await this.model.findByIdAndUpdate(id, { $set: { role: dto.role } });
        await this.invalidateCache();
    }

    async testConnection(dto: { baseUrl: string; apiKey: string; model: string }) {
        try {
            const url = `${dto.baseUrl}/chat/completions`;
            const resp = await fetch(url, {
                method: "POST",
                headers: {
                    Authorization: `Bearer ${dto.apiKey}`,
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    model: dto.model,
                    messages: [{ role: "user", content: "Hi" }],
                    max_tokens: 1,
                    stream: false,
                }),
                signal: AbortSignal.timeout(15_000),
            });

            if (!resp.ok) {
                const body = await resp.text().catch(() => "");
                return { success: false, message: `HTTP ${resp.status}: ${body.slice(0, 200)}` };
            }

            return { success: true, message: "连接成功" };
        } catch (err: any) {
            return { success: false, message: err.message || "连接失败" };
        }
    }

    private maskApiKey(doc: any): any {
        if (!doc.apiKey) return doc;
        const key = doc.apiKey as string;
        if (key.length <= 8) return { ...doc, apiKey: "****" };
        return { ...doc, apiKey: `${key.slice(0, 4)}****${key.slice(-4)}` };
    }
}
