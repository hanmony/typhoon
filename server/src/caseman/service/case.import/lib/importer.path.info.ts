import { Logger } from "@nestjs/common";
import { validate } from "class-validator";
import { ClientSession } from "mongoose";
import { ExcelPathInfoDto } from "src/caseman/domain/dto/excels/excel.path.info.dto";
import { ExcelFile } from "src/common/service/excel/excel.file";
import { CaseDocument } from "src/database/entity/case.schema";
import { PathInfoDocument } from "src/database/entity/path.info.schema";
import { RepoService } from "src/database/service/repo/repo.service";
import { Failed } from "src/diagnostics/lib/failed";

export class ExcelImporterPathInfo {
    constructor(
        protected readonly session: ClientSession,
        protected readonly repo: RepoService,
        protected readonly caseDoc: CaseDocument,
    ) {}

    async importSheet(excel: ExcelFile) {
        excel.use(0, { keyRow: 2 });
        let line = 3;
        while (excel.next()) {
            line++;
            await this.importRow(excel, line).catch(err => {
                Failed.throw(`${line}行, 数据不正确, ${err}`);
            });
        }
    }

    protected async saveRow(item: PathInfoDocument) {
        await item.save({ session: this.session });
    }

    protected async validate(line: number, item: object) {
        const result = await validate(item);
        if (result.length > 0) {
            logger.error(JSON.stringify(item));
            for (const item of result) {
                logger.error(item);
            }
        }
        Failed.check(result.length <= 0, `${line}行, 数据不正确`);
    }
    protected async importRow(excel: ExcelFile, line: number): Promise<void> {
        const dto = new ExcelPathInfoDto();
        excel.parseTo(dto);
        await this.validate(line, dto);
        // console.log("dto", dto);

        const item = new this.repo.pathInfos();
        item.caseId = this.caseDoc.name;
        item.time = dto.time;
        item.time.setFullYear(Number(this.caseDoc.values.get("台风年度").value));
        item.longitude = dto.longitude;
        item.latitude = dto.latitude;
        item.power = dto.power;
        item.radius = dto.radius;
        item.pressure = dto.pressure;
        item.landing = dto.landing;
        await this.saveRow(item);
    }
}

const logger = new Logger(ExcelImporterPathInfo.name);
