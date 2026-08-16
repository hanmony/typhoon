import { Test, TestingModule } from "@nestjs/testing";
import { CaseImportService } from "./case.import.service";

describe("CaseImportService", () => {
    let service: CaseImportService;

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [CaseImportService],
        }).compile();

        service = module.get<CaseImportService>(CaseImportService);
    });

    it("should be defined", () => {
        expect(service).toBeDefined();
    });
});
