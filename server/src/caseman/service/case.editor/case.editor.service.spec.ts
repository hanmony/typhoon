import { Test, TestingModule } from "@nestjs/testing";
import { CaseEditorService } from "./case.editor.service";

describe("CaseEditorService", () => {
    let service: CaseEditorService;

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [CaseEditorService],
        }).compile();

        service = module.get<CaseEditorService>(CaseEditorService);
    });

    it("should be defined", () => {
        expect(service).toBeDefined();
    });
});
