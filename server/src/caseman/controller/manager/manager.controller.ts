import { Controller, Get, Query } from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiQuery, ApiResponse, ApiTags } from "@nestjs/swagger";
import { CaseDetailDto } from "src/caseman/domain/dto/case.detail.dto";
import { ManagerService } from "src/caseman/service/manager/manager.service";
import { ActionDocument } from "src/database/entity/action.schema";
import { CaseDocument, CaseStatus } from "src/database/entity/case.schema";
import { PathInfoDocument, PathInfoEntity } from "src/database/entity/path.info.schema";
import { Failed } from "src/diagnostics/lib/failed";

@ApiBearerAuth()
@ApiTags("案例管理")
@Controller("manager")
export class ManagerController {
    constructor(private readonly manager: ManagerService) {}

    @ApiOperation({ description: "返回所有活跃的案例" })
    @Get("cases")
    @ApiResponse({ status: 200 })
    async getCases(@Query("status") status: CaseStatus): Promise<CaseDocument[]> {
        status = status ?? CaseStatus.normal;
        return await this.manager.getCases(status);
    }

    @ApiOperation({ description: "返回指定案例" })
    @Get("case")
    @ApiResponse({ status: 200 })
    async getCase(@Query("id") id: string): Promise<CaseDocument> {
        Failed.check(id, "id is required");
        return await this.manager.getCase(id);
    }

    @ApiOperation({ description: "返回指定案例全部信息" })
    @Get("case-detail")
    @ApiResponse({ status: 200 })
    async getCaseDetail(@Query("id") id: string): Promise<CaseDetailDto> {
        Failed.check(id, "id is required");
        return await this.manager.getCaseDetail(id);
    }

    @ApiOperation({ description: "返回指定案例的台风路径" })
    @Get("path-info")
    @ApiResponse({ status: 200, type: PathInfoEntity })
    async getPathInfos(@Query("id") id: string): Promise<PathInfoDocument[]> {
        Failed.check(id, "id is required");
        return await this.manager.getPathInfos(id);
    }

    @ApiOperation({ description: "获取指定案例的下一个事件" })
    @ApiQuery({ name: "case", required: true, type: String, description: "案例ID" })
    @ApiQuery({ name: "lastid", required: false, type: String, description: "上一个事件的ID" })
    @Get("next")
    @ApiResponse({ status: 200 })
    async getNext(@Query("case") caseId: string, @Query("lastid") lastEventId: string): Promise<ActionDocument> {
        return await this.manager.getNextEvent(caseId, lastEventId);
    }

    @ApiOperation({ description: "获取指定案例的事件" })
    @ApiQuery({ name: "case", required: true, type: String, description: "案例ID" })
    @ApiQuery({ name: "category", required: false, type: String, description: "事件的种类，不指定的话返回所有的" })
    @ApiResponse({ status: 200 })
    @Get("events")
    async getEvents(@Query("caseId") caseId: string, @Query("category") category: string): Promise<ActionDocument[]> {
        const items = await this.manager.getEvents(caseId, category);
        return items;
    }
}
