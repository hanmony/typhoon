import { Test, TestingModule } from "@nestjs/testing";
import { DigitalPlanService } from "./digital.plan.service";

describe("DigitalPlanService", () => {
    let service: DigitalPlanService;

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [DigitalPlanService],
        }).compile();

        service = module.get<DigitalPlanService>(DigitalPlanService);
    });

    it("should be defined", () => {
        expect(service).toBeDefined();
    });
});
