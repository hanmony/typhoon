import { Module } from "@nestjs/common";
import { CommonModule } from "src/common/common.module";
import { DatabaseModule } from "src/database/database.module";
import { CaseEditorController } from "./controller/case.editor/case.editor.controller";
import { CaseImporterController } from "./controller/case.importer/case.importer.controller";
import { ManagerController } from "./controller/manager/manager.controller";
import { CaseEditorService } from "./service/case.editor/case.editor.service";
import { CaseImportService } from "./service/case.import/case.import.service";
import { ManagerService } from "./service/manager/manager.service";
import { PortalController } from "./portal/portal.controller";
import { PortalService } from "./service/portal/portal.service";
import { LogModule } from "src/log/log.module";
import { ShpController } from "./controller/shp/shp.controller";
import { ShpService } from "./service/shp/shp.service";
import { DigitalPlanController } from "./controller/digital.plan/digital.plan.controller";
import { DigitalPlanService } from "./service/digital.plan/digital.plan.service";

@Module({
    imports: [DatabaseModule, CommonModule, LogModule],
    controllers: [
        ManagerController,
        DigitalPlanController,
        ShpController,
        CaseImporterController,
        CaseEditorController,
        PortalController,
    ],
    providers: [ManagerService, DigitalPlanService, ShpService, CaseImportService, CaseEditorService, PortalService],
})
export class CasemanModule {}
