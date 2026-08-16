import { ClientSession, Model } from "mongoose";
import { ExcelFile } from "src/common/service/excel/excel.file";
import { CaseConfigItem, CaseDocument, CaseEntity, CaseStatus } from "src/database/entity/case.schema";
import { ActionCategory } from "src/database/lib/action.category";
import { Failed } from "src/diagnostics/lib/failed";

export async function excelImportConfig(
    excel: ExcelFile,
    model: Model<CaseEntity>,
    session: ClientSession,
): Promise<CaseDocument> {
    excel.use(ActionCategory.config);
    const configs = new Map<string, CaseConfigItem>();
    while (excel.next()) {
        const dto = new CaseConfigItem();
        excel.parseTo(dto);
        configs.set(dto.key, dto);
    }
    const data = new model();
    data.name = configs.get("台风命名").value;
    data.values = configs;
    data.status = CaseStatus.approving;

    // check name exists
    const exists = await model
        .exists({
            name: data.name,
            status: { $ne: CaseStatus.deleted },
        })
        .exec();
    Failed.check(!exists, "案例名称已存在");
    await data.save({ session });
    return data;
}
