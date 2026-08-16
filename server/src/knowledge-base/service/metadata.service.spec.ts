import { Test, TestingModule } from "@nestjs/testing";
import { MetadataService } from "./metadata.service";
import { LlmService } from "src/llm";
import { RepoService } from "src/database/service/repo/repo.service";

describe("MetadataService", () => {
    let service: MetadataService;
    let llmService: jest.Mocked<LlmService>;
    let repo: jest.Mocked<RepoService>;

    const mockDoc = {
        _id: { toString: () => "doc-1" },
        name: "test.pdf",
        autoTags: [] as string[],
        summary: "",
        save: jest.fn().mockResolvedValue(undefined),
    } as any;

    const mockChunks = [{ content: "chunk-1" }, { content: "chunk-2" }] as any;

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                MetadataService,
                {
                    provide: LlmService,
                    useValue: {
                        chat: jest.fn(),
                    },
                },
                {
                    provide: RepoService,
                    useValue: {
                        kbDocuments: { findById: jest.fn() },
                        kbChunks: { find: jest.fn() },
                    },
                },
            ],
        }).compile();

        service = module.get(MetadataService);
        llmService = module.get(LlmService) as jest.Mocked<LlmService>;
        repo = module.get(RepoService) as jest.Mocked<RepoService>;
        jest.clearAllMocks();
        mockDoc.save.mockClear();
        mockDoc.autoTags = [];
        mockDoc.summary = "";
    });

    describe("generateMetadata", () => {
        it("should throw when LLM call fails (R1: no silent fallback)", async () => {
            const llmError = new Error("401 Unauthorized");
            llmService.chat.mockRejectedValue(llmError);

            await expect(service.generateMetadata(["chunk-1"])).rejects.toThrow("401 Unauthorized");
        });

        it("should throw when LLM returns unparseable JSON (R1: parse error propagates)", async () => {
            llmService.chat.mockResolvedValue({ content: "not json" } as any);

            await expect(service.generateMetadata(["chunk-1"])).rejects.toThrow(/No JSON found/);
        });

        it("should return parsed metadata when LLM succeeds", async () => {
            llmService.chat.mockResolvedValue({
                content: '{"autoTags": ["防台", "应急"], "summary": "防汛文档"}',
            } as any);

            const result = await service.generateMetadata(["chunk-1"]);
            expect(result.autoTags).toEqual(["防台", "应急"]);
            expect(result.summary).toBe("防汛文档");
        });
    });

    describe("enrichDocument", () => {
        beforeEach(() => {
            (repo.kbDocuments.findById as jest.Mock).mockResolvedValue(mockDoc);
            (repo.kbChunks.find as jest.Mock).mockReturnValue({
                sort: jest.fn().mockResolvedValue(mockChunks),
            });
        });

        it("should throw when metadata generation fails (R1: error propagates)", async () => {
            llmService.chat.mockRejectedValue(new Error("LLM timeout"));

            await expect(service.enrichDocument("doc-1")).rejects.toThrow("LLM timeout");
            // ensure partial state was not silently saved with empty values
            expect(mockDoc.save).not.toHaveBeenCalled();
        });

        it("should save tags and summary on success", async () => {
            llmService.chat.mockResolvedValue({
                content: '{"autoTags": ["a"], "summary": "summary text"}',
            } as any);

            await service.enrichDocument("doc-1");
            expect(mockDoc.autoTags).toEqual(["a"]);
            expect(mockDoc.summary).toBe("summary text");
            expect(mockDoc.save).toHaveBeenCalledTimes(1);
        });
    });
});
