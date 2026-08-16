import { Test, TestingModule } from "@nestjs/testing";
import { CaseImporterController } from "./case.importer.controller";

describe("CaseImporterController", () => {
    let controller: CaseImporterController;

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            controllers: [CaseImporterController],
        }).compile();

        controller = module.get<CaseImporterController>(CaseImporterController);
    });

    it("should be defined", () => {
        expect(controller).toBeDefined();
    });
});
