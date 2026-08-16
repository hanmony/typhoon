import { Module } from "@nestjs/common";
import { ExcelService } from "./service/excel/excel.service";

@Module({
    providers: [ExcelService],
    exports: [ExcelService],
})
export class CommonModule {}
