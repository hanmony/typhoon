import { Injectable, Logger } from "@nestjs/common";
import * as fs from "fs";
import * as xlsx from "node-xlsx";
import * as pdfParse from "pdf-parse";

@Injectable()
export class ParserService {
    private readonly logger = new Logger(ParserService.name);

    async parse(filePath: string, fileType: string): Promise<string> {
        switch (fileType.toLowerCase()) {
            case "xlsx":
            case "xls":
                return this.parseExcel(filePath);
            case "txt":
            case "md":
                return this.parseText(filePath);
            case "pdf":
                return this.parsePdf(filePath);
            default:
                throw new Error(`Unsupported file type: ${fileType}`);
        }
    }

    private async parseExcel(filePath: string): Promise<string> {
        const sheets = xlsx.parse(filePath);
        const parts: string[] = [];

        for (const sheet of sheets) {
            parts.push(`## Sheet: ${sheet.name}`);
            for (const row of sheet.data) {
                const cells = row.map((cell: any) => (cell != null ? String(cell) : ""));
                if (cells.some((c: string) => c.trim())) {
                    parts.push(cells.join(" | "));
                }
            }
        }

        return parts.join("\n");
    }

    private async parseText(filePath: string): Promise<string> {
        return fs.promises.readFile(filePath, "utf-8");
    }

    private async parsePdf(filePath: string): Promise<string> {
        const buffer = await fs.promises.readFile(filePath);
        const result = await pdfParse(buffer);
        return result.text;
    }
}
