import { of } from "rxjs";
import { EmbeddingService } from "./embedding.service";

/**
 * EmbeddingService 阶段 F 缓存单测
 * 覆盖：命中缓存、LRU 最近使用刷新、容量 0/负数/非法值（禁用缓存）、批量 embedTexts 不缓存。
 */
function makeConfig(overrides: Record<string, string> = {}) {
    return {
        get: (key: string, def?: any) => overrides[key] ?? def,
    } as any;
}

function makeHttp() {
    // 模拟 OpenAI 兼容 /embeddings：每个输入文本返回一个向量
    return {
        post: jest.fn().mockImplementation((_url: string, body: any) =>
            of({ data: { data: (body.input as string[]).map(() => ({ embedding: [0.1] })) } }),
        ),
    } as any;
}

function makeService(overrides: Record<string, string> = {}) {
    const http = makeHttp();
    const service = new EmbeddingService(makeConfig(overrides), http);
    return { service, http };
}

describe("EmbeddingService cache (阶段 F)", () => {
    it("同一问题第二次命中缓存，API 只调用一次，返回同一向量", async () => {
        const { service, http } = makeService();
        const a1 = await service.embedQuery("台风来了怎么办？");
        const a2 = await service.embedQuery("台风来了怎么办？");
        expect(http.post).toHaveBeenCalledTimes(1);
        expect(a2).toEqual(a1);
    });

    it("不同问题不共享缓存", async () => {
        const { service, http } = makeService();
        await service.embedQuery("问题甲");
        await service.embedQuery("问题乙");
        expect(http.post).toHaveBeenCalledTimes(2);
    });

    it("LRU：命中后刷新最近使用位置，容量满时淘汰最久未用", async () => {
        const { service, http } = makeService({ EMBEDDING_CACHE_SIZE: "2" });
        await service.embedQuery("a"); // call1 缓存 a
        await service.embedQuery("b"); // call2 缓存 a,b
        await service.embedQuery("a"); // 命中 a，刷新 → 顺序 b,a
        await service.embedQuery("c"); // call3 满 → 淘汰最久未用 b → 缓存 a,c
        expect(http.post).toHaveBeenCalledTimes(3);

        // a 因被刷新过而存活 → 命中，不再调用 API
        await service.embedQuery("a");
        expect(http.post).toHaveBeenCalledTimes(3);

        // b 已被淘汰 → 再次查询 b 重新调用 API（call4）
        await service.embedQuery("b");
        expect(http.post).toHaveBeenCalledTimes(4);
    });

    it("容量为 0：禁用缓存，每次都调用 API", async () => {
        const { service, http } = makeService({ EMBEDDING_CACHE_SIZE: "0" });
        await service.embedQuery("x");
        await service.embedQuery("x");
        expect(http.post).toHaveBeenCalledTimes(2);
    });

    it("容量为负数：按 0 处理（禁用缓存）", async () => {
        const { service, http } = makeService({ EMBEDDING_CACHE_SIZE: "-5" });
        await service.embedQuery("x");
        await service.embedQuery("x");
        expect(http.post).toHaveBeenCalledTimes(2);
    });

    it("容量为非法值：按 0 处理（禁用缓存）", async () => {
        const { service, http } = makeService({ EMBEDDING_CACHE_SIZE: "abc" });
        await service.embedQuery("x");
        await service.embedQuery("x");
        expect(http.post).toHaveBeenCalledTimes(2);
    });

    it("批量 embedTexts 不经过缓存（建索引路径不受影响）", async () => {
        const { service, http } = makeService();
        const out = await service.embedTexts(["甲", "乙"]);
        expect(out).toEqual([[0.1], [0.1]]); // mock 每个输入返回一个向量
        expect(http.post).toHaveBeenCalledTimes(1);
        // 批量调用后，单问题查询首次 miss（call2），再次命中（仍 2 次）
        await service.embedQuery("甲");
        await service.embedQuery("甲");
        expect(http.post).toHaveBeenCalledTimes(2);
    });
});
