import { Controller, Get, Query } from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from "@nestjs/swagger";
import { CaseCategory, DiscoverCaseMap, PortalService } from "../service/portal/portal.service";
import { CaseDocument } from "src/database/entity/case.schema";

@ApiBearerAuth()
@ApiTags("门户接口路由")
@Controller("portal")
export class PortalController {
    constructor(private readonly portalService: PortalService) {}
    @ApiOperation({ description: "返回" })
    @Get("discover")
    @ApiResponse({ status: 200 })
    async getCasesMapByCategory(): Promise<DiscoverCaseMap> {
        return await this.portalService.getCasesMapByCategory();
    }

    @ApiOperation({ description: "返回" })
    @Get("list")
    @ApiResponse({ status: 200 })
    async getList(
        @Query("search") search?: string,
        @Query("year") year?: string[],
        @Query("category") category?: CaseCategory[],
    ): Promise<CaseDocument[]> {
        return await this.portalService.search({ searchText: search, year, category });
    }

    @ApiOperation({ description: "返回" })
    @Get("cases")
    @ApiResponse({ status: 200 })
    async getCases(
        @Query("search") search?: string,
        @Query("year") year?: string,
        @Query("order") order?: string,
    ): Promise<CaseDocument[]> {
        return await this.portalService.getListWithParams({ searchText: search, order, year });
    }
}
