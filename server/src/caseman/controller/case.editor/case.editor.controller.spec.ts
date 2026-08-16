import { Test, TestingModule } from "@nestjs/testing";
import { CaseEditorController } from "./case.editor.controller";

describe("CaseEditorController", () => {
    let controller: CaseEditorController;

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            controllers: [CaseEditorController],
        }).compile();

        controller = module.get<CaseEditorController>(CaseEditorController);
    });

    it("should be defined", () => {
        expect(controller).toBeDefined();
    });
});
