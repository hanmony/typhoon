import { Injectable, Logger, OnModuleInit } from "@nestjs/common";
import { RepoService } from "src/database/service/repo/repo.service";

export interface CatalogEntry {
    id: string;
    name: string;
    category: string;
    autoTags: string[];
    manualTags: string[];
    summary: string;
}

@Injectable()
export class KbCatalogCache implements OnModuleInit {
    private readonly logger = new Logger(KbCatalogCache.name);
    private catalog = new Map<string, CatalogEntry>();

    constructor(private readonly repo: RepoService) {}

    async onModuleInit() {
        await this.loadAll();
    }

    private async loadAll() {
        const docs = await this.repo.kbDocuments.find({ status: 3 });
        this.catalog.clear();
        for (const doc of docs) {
            this.catalog.set(doc._id.toString(), {
                id: doc._id.toString(),
                name: doc.name,
                category: doc.category || "other",
                autoTags: doc.autoTags || [],
                manualTags: doc.manualTags || [],
                summary: doc.summary || "",
            });
        }
        this.logger.log(`Catalog cache loaded: ${this.catalog.size} documents`);
    }

    async refresh() {
        await this.loadAll();
    }

    async update(documentId: string) {
        const doc = await this.repo.kbDocuments.findById(documentId);
        if (!doc || doc.status !== 3) {
            this.catalog.delete(documentId);
            return;
        }
        this.catalog.set(documentId, {
            id: doc._id.toString(),
            name: doc.name,
            category: doc.category || "other",
            autoTags: doc.autoTags || [],
            manualTags: doc.manualTags || [],
            summary: doc.summary || "",
        });
    }

    remove(documentId: string) {
        this.catalog.delete(documentId);
    }

    getAllTags(): string[] {
        const tags = new Set<string>();
        for (const entry of this.catalog.values()) {
            for (const t of entry.autoTags) tags.add(t);
            for (const t of entry.manualTags) tags.add(t);
        }
        return Array.from(tags);
    }

    getCatalog(): CatalogEntry[] {
        return Array.from(this.catalog.values());
    }

    getCapabilityDescription(): string {
        const entries = this.getCatalog();
        if (entries.length === 0) return "";

        const tags = this.getAllTags();
        if (tags.length === 0) return "";

        return `你可以回答与以下主题相关的问题：${tags.join("、")}等。`;
    }
}
