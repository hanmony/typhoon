import { Test, TestingModule } from "@nestjs/testing";
import { DigitalPlanController } from "./digital.plan.controller";

describe("DigitalPlanController", () => {
    let controller: DigitalPlanController;

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            controllers: [DigitalPlanController],
        }).compile();

        controller = module.get<DigitalPlanController>(DigitalPlanController);
    });

    it("should be defined", () => {
        expect(controller).toBeDefined();
    });
});
