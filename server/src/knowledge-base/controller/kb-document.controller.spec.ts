import { Test, TestingModule } from "@nestjs/testing";
import { EventEmitter2 } from "@nestjs/event-emitter";
import { KbDocumentController } from "./kb-document.controller";
import { DocumentService } from "../service/document.service";
import { MetadataService } from "../service/metadata.service";
import { KbCatalogCache } from "../service/catalog-cache.service";

describe("KbDocumentController — batch metadata endpoint", () => {
    let controller: KbDocumentController;
    let docService: jest.Mocked<DocumentService>;
    let metadataService: jest.Mocked<MetadataService>;
    let catalogCache: jest.Mocked<KbCatalogCache>;

    const makeDoc = (id: string, name: string) =>
        ({
            _id: { toString: () => id },
            name,
        }) as any;

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            controllers: [KbDocumentController],
            providers: [
                {
                    provide: DocumentService,
                    useValue: { listDocumentsWithoutMetadata: jest.fn() },
                },
                {
                    provide: MetadataService,
                    useValue: { enrichDocument: jest.fn() },
                },
                {
                    provide: KbCatalogCache,
                    useValue: { update: jest.fn() },
                },
                {
                    // ActionLoggerInterceptor (used by @ActionLog on controller methods)
                    // requires EventEmitter2. Provide a no-op mock to satisfy DI.
                    provide: EventEmitter2,
                    useValue: { emit: jest.fn() },
                },
            ],
        }).compile();

        controller = module.get(KbDocumentController);
        docService = module.get(DocumentService) as jest.Mocked<DocumentService>;
        metadataService = module.get(MetadataService) as jest.Mocked<MetadataService>;
        catalogCache = module.get(KbCatalogCache) as jest.Mocked<KbCatalogCache>;
    });

    it("returns only { processed } when all succeed (R2: failed omitted when empty)", async () => {
        docService.listDocumentsWithoutMetadata.mockResolvedValue([
            makeDoc("d1", "a.pdf"),
            makeDoc("d2", "b.pdf"),
        ] as any);
        metadataService.enrichDocument.mockResolvedValue(undefined);
        catalogCache.update.mockResolvedValue(undefined);

        const result = await controller.generateAllMetadata();

        expect(result).toEqual({ processed: 2 });
        expect((result as any).failed).toBeUndefined();
    });

    it("returns { processed, failed } with per-doc error when some fail (R2)", async () => {
        docService.listDocumentsWithoutMetadata.mockResolvedValue([
            makeDoc("d1", "a.pdf"),
            makeDoc("d2", "b.pdf"),
            makeDoc("d3", "c.pdf"),
        ] as any);
        metadataService.enrichDocument
            .mockResolvedValueOnce(undefined) // d1 ok
            .mockRejectedValueOnce(new Error("401 Unauthorized")) // d2 fail
            .mockResolvedValueOnce(undefined); // d3 ok
        catalogCache.update.mockResolvedValue(undefined);

        const result = await controller.generateAllMetadata();

        expect(result.processed).toBe(2);
        expect(result.failed).toEqual([{ id: "d2", name: "b.pdf", error: "401 Unauthorized" }]);
    });

    it("includes every failure in failed[] when all fail (R2)", async () => {
        docService.listDocumentsWithoutMetadata.mockResolvedValue([
            makeDoc("d1", "a.pdf"),
            makeDoc("d2", "b.pdf"),
        ] as any);
        metadataService.enrichDocument
            .mockRejectedValueOnce(new Error("network error"))
            .mockRejectedValueOnce(new Error("parse error"));

        const result = await controller.generateAllMetadata();

        expect(result.processed).toBe(0);
        expect(result.failed).toHaveLength(2);
        expect(result.failed?.[0]).toEqual({ id: "d1", name: "a.pdf", error: "network error" });
        expect(result.failed?.[1]).toEqual({ id: "d2", name: "b.pdf", error: "parse error" });
    });

    it("returns { processed: 0 } without failed key when no docs to process", async () => {
        docService.listDocumentsWithoutMetadata.mockResolvedValue([] as any);

        const result = await controller.generateAllMetadata();

        expect(result).toEqual({ processed: 0 });
        expect((result as any).failed).toBeUndefined();
    });
});
