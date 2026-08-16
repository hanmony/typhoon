import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";

export interface ChunkConfig {
    strategy: "paragraph" | "sliding_window";
    chunkSize: number;
    overlap: number;
}

export const CATEGORY_CHUNK_PRESETS: Record<string, ChunkConfig> = {
    typhoon_case: { strategy: "paragraph", chunkSize: 800, overlap: 80 },
    regulation: { strategy: "paragraph", chunkSize: 500, overlap: 50 },
    emergency_plan: { strategy: "paragraph", chunkSize: 600, overlap: 60 },
    other: { strategy: "sliding_window", chunkSize: 500, overlap: 50 },
};

@Injectable()
export class ChunkService {
    private readonly defaultChunkSize: number;
    private readonly defaultOverlap: number;

    constructor(private readonly config: ConfigService) {
        this.defaultChunkSize = parseInt(config.get("KB_CHUNK_SIZE", "500"), 10);
        this.defaultOverlap = parseInt(config.get("KB_CHUNK_OVERLAP", "50"), 10);
    }

    static resolveConfig(category: string, strategy?: string, chunkSize?: number, overlap?: number): ChunkConfig {
        if (strategy && strategy !== "auto") {
            return {
                strategy: strategy as "paragraph" | "sliding_window",
                chunkSize: chunkSize ?? 500,
                overlap: overlap ?? 50,
            };
        }
        return CATEGORY_CHUNK_PRESETS[category] ?? CATEGORY_CHUNK_PRESETS.other;
    }

    chunkWithConfig(text: string, config: ChunkConfig): string[] {
        if (config.strategy === "paragraph") {
            return this.chunkByParagraph(text, config.chunkSize, config.overlap);
        }
        return this.chunkText(text, config.chunkSize, config.overlap);
    }

    chunkByParagraph(text: string, chunkSize: number, overlap: number): string[] {
        const paragraphs = text
            .split(/\n{2,}/)
            .map(p => p.trim())
            .filter(Boolean);
        if (paragraphs.length === 0) return [];

        const chunks: string[] = [];
        let current = "";

        for (const para of paragraphs) {
            // 单段超长，回退到滑动窗口
            if (para.length > chunkSize) {
                if (current.trim()) {
                    chunks.push(current.trim());
                    current = "";
                }
                chunks.push(...this.chunkText(para, chunkSize, overlap));
                continue;
            }

            // 累积合并
            const candidate = current ? current + "\n\n" + para : para;
            if (candidate.length > chunkSize && current.trim()) {
                chunks.push(current.trim());
                // overlap: 取上一段尾部
                const tail = current.slice(Math.max(0, current.length - overlap));
                current = tail + "\n\n" + para;
            } else {
                current = candidate;
            }
        }

        if (current.trim()) {
            chunks.push(current.trim());
        }

        return chunks;
    }

    chunkText(text: string, chunkSize?: number, overlap?: number): string[] {
        const size = chunkSize ?? this.defaultChunkSize;
        const ov = Math.min(overlap ?? this.defaultOverlap, size - 1);

        if (text.length <= size) {
            return text.trim() ? [text.trim()] : [];
        }

        const chunks: string[] = [];
        let start = 0;

        while (start < text.length) {
            let end = Math.min(start + size, text.length);

            if (end < text.length) {
                const breakPoint = this.findBreakPoint(text, end, size * 0.2);
                if (breakPoint > start) {
                    end = breakPoint;
                }
            }

            const chunk = text.slice(start, end).trim();
            if (chunk) chunks.push(chunk);

            const next = end - ov;
            if (next <= start) {
                start = end;
            } else {
                start = next;
            }
        }

        return chunks;
    }

    private findBreakPoint(text: string, pos: number, tolerance: number): number {
        const start = Math.max(0, Math.floor(pos - tolerance));
        const end = Math.min(text.length, Math.floor(pos + tolerance));

        const breakChars = ["\n", "。", "！", "？", ".", "!", "?", "；", ";"];

        for (let i = end; i >= start; i--) {
            if (breakChars.includes(text[i])) {
                return i + 1;
            }
        }

        return pos;
    }
}
