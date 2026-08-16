import { Test, TestingModule } from "@nestjs/testing";
import { ShpController } from "./shp.controller";

describe("ShpController", () => {
    let controller: ShpController;

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            controllers: [ShpController],
        }).compile();

        controller = module.get<ShpController>(ShpController);
    });

    it("should be defined", () => {
        expect(controller).toBeDefined();
    });
});
