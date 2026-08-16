import { Test, TestingModule } from "@nestjs/testing";
import { ShpService } from "./shp.service";

describe("ShpService", () => {
    let service: ShpService;

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [ShpService],
        }).compile();

        service = module.get<ShpService>(ShpService);
    });

    it("should be defined", () => {
        expect(service).toBeDefined();
    });
});
