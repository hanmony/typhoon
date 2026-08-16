import { ConfigService } from "@nestjs/config";
import { Test, TestingModule } from "@nestjs/testing";
import { AppConfigService } from "./appconfig.service";

describe("AppConfigService", () => {
    let service: AppConfigService;

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [AppConfigService, ConfigService],
        })
            .overrideProvider(ConfigService)
            .useValue({})
            .compile();

        service = module.get<AppConfigService>(AppConfigService);
    });

    it("should be defined", () => {
        expect(service).toBeDefined();
    });
});
