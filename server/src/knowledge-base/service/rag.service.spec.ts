import { RagService } from "./rag.service";

const execQuery = (items: any[]) => ({ exec: jest.fn().mockResolvedValue(items) });
const makeResult = (id: string, documentId: string, chunkIndex: number) => ({
    id,
    score: 0.9,
    content: `semantic-${id}`,
    documentId,
    documentName: `semantic-${documentId}`,
    chunkIndex,
});

describe("RagService hybrid retrieval", () => {
    const documents = [
        { _id: "d1", name: "附件9历年台风汇总表", category: "typhoon_case" },
        { _id: "d2", name: "2023年防台通知", category: "regulation" },
    ];
    const chunks = Array.from({ length: 6 }, (_, index) => ({
        _id: `c${index}`,
        qdrantPointId: `p${index}`,
        documentId: index < 5 ? "d1" : "d2",
        chunkIndex: index,
        content: index < 5 ? `附件9记载全路网14条线路限速，第${index + 1}项。` : "2023年通知要求关注高架线路。",
    }));

    const createService = (semantic: any[] = [makeResult("s1", "sdoc", 1)], options: { failVector?: boolean; emptyDb?: boolean } = {}) => {
        const embedding = {
            embedQuery: options.failVector
                ? jest.fn().mockRejectedValue(new Error("embedding down"))
                : jest.fn().mockResolvedValue([0.1]),
        };
        const qdrant = { search: jest.fn().mockResolvedValue(semantic) };
        const repo = {
            kbDocuments: { find: jest.fn().mockReturnValue(execQuery(options.emptyDb ? [] : documents)) },
            kbChunks: { find: jest.fn().mockReturnValue(execQuery(options.emptyDb ? [] : chunks)) },
        };
        return { service: new RagService(embedding as any, qdrant as any, {} as any, repo as any), embedding, qdrant };
    };

    it("uses four lexical results plus one semantic result for topK=5", async () => {
        const { service } = createService();
        const results = await service.retrieve("附件9中有多少条线路限速？", 5);

        expect(results).toHaveLength(5);
        expect(results.slice(0, 4).every(item => item.documentId === "d1")).toBe(true);
        expect(results[4].id).toBe("s1");
    });

    it("deduplicates semantic candidates by document and chunk", async () => {
        const semantic = [
            makeResult("duplicate", "d1", 0),
            makeResult("unique", "semantic-doc", 2),
        ];
        const { service } = createService(semantic);
        const results = await service.retrieve("附件9中有多少条线路限速？", 5);

        expect(results).toHaveLength(5);
        expect(results.filter(item => item.documentId === "d1" && item.chunkIndex === 0)).toHaveLength(1);
        expect(results.some(item => item.id === "unique")).toBe(true);
    });

    it("weights exact document names and numbers and respects category", async () => {
        const { service } = createService([]);
        const results = await service.retrieve("2023年通知重点关注什么？", 3, "regulation");

        expect(results.length).toBeGreaterThan(0);
        expect(results.every(item => item.documentId === "d2")).toBe(true);
        expect(results[0].documentName).toContain("2023年防台通知");
    });

    it("falls back to all lexical slots when vector retrieval fails", async () => {
        const { service } = createService([], { failVector: true });
        const results = await service.retrieve("附件9中有多少条线路限速？", 5);

        expect(results).toHaveLength(5);
        expect(results.every(item => item.documentId === "d1")).toBe(true);
    });

    it("returns an empty list for an empty knowledge base and empty vector index", async () => {
        const { service } = createService([], { emptyDb: true });
        await expect(service.retrieve("任意问题", 5)).resolves.toEqual([]);
    });
});
