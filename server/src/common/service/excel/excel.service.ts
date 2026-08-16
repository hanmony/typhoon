import { Injectable, Logger } from "@nestjs/common";
import { ExcelFile } from "./excel.file";

@Injectable()
export class ExcelService {
    open(path: string): ExcelFile {
        try {
            const file = new ExcelFile();
            file.open(path);
            return file;
        } catch (err) {
            logger.error(path, err);
        }
    }
}

const logger = new Logger(ExcelService.name);
