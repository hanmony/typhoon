import { Logger } from "@nestjs/common";
import xlsx from "node-xlsx";
import { isNullOrEmpty } from "../../lib/string.helper";

const importExcelItemMetaKey = Symbol("import-excel-item-meta-key");

export type excelParser = (raw: string) => unknown;

export function ExcelColumn(column: string, convertor?: excelParser) {
    return Reflect.metadata(importExcelItemMetaKey, { column, convertor });
}

/**
 * Parses the raw data from an Excel file and returns a string or number.
 *
 * @param raw The raw data to be parsed.
 * @returns The parsed data as a string or number.
 */
export function excelDefaultParser(raw: string): string | number | undefined {
    if (typeof raw === "number") {
        return Number(raw);
    }
    if (!raw) {
        return undefined;
    }
    return String(raw).trim();
}

/**
 * Parses the raw data from an Excel file and returns a string or number.
 *
 * @param raw The raw data to be parsed.
 * @returns The parsed data as a string or number.
 */
export function excelDefaultValue(defaultValue: string | number): excelParser {
    return raw => {
        if (!raw) {
            return defaultValue;
        }
        return excelDefaultParser(raw);
    };
}

/**
 * Parses a raw string into an array of values using a specified splitter.
 *
 * @param splitter The string used to split the raw input. Defaults to "[\\,，\r\n]+".
 * @returns An array of parsed values.
 */
export function excelArrayParserReg(splitter: string = "[\\,，\r\n]+"): excelParser {
    return raw => {
        if (!raw) {
            return [];
        }
        const ret = raw.split(new RegExp(splitter)).map(item => item.trim());
        return ret;
    };
}

/**
 * Parses a raw string into an array of values using a specified splitter.
 * @param splitter The delimiter used to split the raw string. Defaults to ",".
 * @returns An array of parsed values.
 */
export function excelArrayParser(splitter: string = ","): excelParser {
    return raw => {
        if (!raw) {
            return [];
        }
        const ret = raw.split(splitter).map(item => item.trim());
        return ret;
    };
}

/**
 * Parses a string representation of a date in Excel format and returns a Date object.
 * If the string contains a time component, it will be parsed as is. Otherwise, it will be treated as a numeric representation of a date.
 * @returns A Date object representing the parsed date.
 */
export function excelDateParser(raw: string): Date {
    const eternal = new Date(3000, 0);
    if (!raw) {
        return eternal;
    }
    if (raw == "长期" || isNullOrEmpty(String(raw))) {
        return eternal;
    }
    if (typeof raw == "string" && (raw.includes(":") || raw.includes("-"))) {
        return new Date(raw);
    } else {
        return convertExcelDate(Number(raw));
    }
}

/**
 * Converts an Excel date to a JavaScript Date object.
 * @param excelDate - The Excel date to convert.
 * @returns The converted JavaScript Date object.
 */
export function convertExcelDate(excelDate: number): Date {
    const date = new Date(1899, 11, 30, 0, 0, 0); // Excel 日期时间的起始日期为 1899 年 12 月 30 日
    const milliseconds = Math.ceil(excelDate * 24 * 60 * 60 * 1000); // Excel 日期时间是自起始日期以来的天数，乘以一天的毫秒数
    date.setMilliseconds(date.getMilliseconds() + milliseconds);
    return date;
}

/**
 * Represents the options for an Excel book.
 * keyRow: The row index of the key row. The key row contains the column names.
 */
export class ExcelBookOption {
    keyRow?: number;
}

/**
 * Represents an Excel book.
 */
export class ExcelBook {
    name: string;
    data: unknown[][];
}

/**
 * Excel data
 */
export class ExcelFile {
    private books: ExcelBook[];
    private keys: Map<string, number> = new Map();
    private cursor: number = 1;
    private rows: unknown[][] = [];

    public open(path: string) {
        this.books = xlsx.parse(path);
    }

    /**
     * 返回所有sheet的名称
     * @returns
     */
    public getSheetNames() {
        return this.books.map(book => book.name);
    }

    /**
     * 返回所有的key
     * @returns
     */
    public getSheetKeys() {
        return Array.from(this.keys.keys());
    }

    /**
     * Validates the data.
     * @returns {boolean} Returns true if the data is valid, false otherwise.
     */
    public validate() {
        if (!this.books) {
            return false;
        }
        if (this.books.length <= 0) {
            return false;
        }
        return true;
    }

    public getCursor() {
        return this.cursor;
    }

    /**
     * Sets the active book and updates the rows and cursor accordingly.
     * If the index is a number, it sets the active book based on the index.
     * If the index is a string, it finds the book with the matching name and sets it as the active book.
     * @param index - The index or name of the book to set as active.
     * @param option - Optional ExcelBookOption object.
     */
    public use(index: number | string, option?: ExcelBookOption) {
        const bookIndex = typeof index === "number" ? index : this.books.findIndex(book => book.name === index);
        this.rows = this.books[bookIndex].data;
        this.cursor = option?.keyRow ? option.keyRow : 0;
        const keyRow = this.rows[option?.keyRow ?? 0];
        this.keys.clear();
        keyRow.forEach((key, col) => {
            this.keys.set(String(key).trim(), col);
        });
    }

    /**
     * Retrieves the value of a cell in the Excel data.
     *
     * @param index - The index of the cell, either as a string or a number.
     * @param defaultValue - The default value to return if the cell is empty or undefined.
     * @returns The value of the cell as a string.
     */
    public getCell(index: string | number, defaultValue?: string): string | undefined {
        const col = this.parseIndex(index);
        if (col < 0) {
            return undefined;
        }
        const value = this.rows[this.cursor][col];
        if (!value) {
            return defaultValue;
        }
        const ret = String(value).trim();
        return ret.trim();
    }

    /**
     * Parses the given instance by converting its properties based on metadata.
     * @param instance The instance to parse.
     */
    public parseTo(instance: unknown) {
        // const keys = Reflect.getMetadata(importExcelItemMetaKey, instance);
        // console.log("meta: ", keys);
        for (const key in instance as any) {
            if (Object.prototype.hasOwnProperty.call(instance, key)) {
                const meta = Reflect.getMetadata(importExcelItemMetaKey, instance, key);
                if (!meta) {
                    continue;
                }
                let convertor: (raw: string) => unknown = excelDefaultParser;
                if (meta.convertor) {
                    convertor = meta.convertor;
                }
                try {
                    const element = convertor.call(this, this.getCell(meta.column));
                    instance[key] = element;
                } catch (err) {
                    logger.error("parseTo failed", err, meta.column, this.getCell(meta.column));
                    throw err;
                }
            }
        }
        return instance;
    }

    /**
     * Moves the cursor to the next row in the Excel data.
     * @returns {boolean} True if there is a next row, false otherwise.
     */
    public next(skipBlank: boolean = true): boolean {
        if (this.cursor >= this.rows.length) {
            return false;
        }
        this.cursor++;
        if (skipBlank) {
            while (this.isBlankRow()) {
                if (this.cursor >= this.rows.length) {
                    return false;
                }
                this.cursor++;
            }
        }

        return this.cursor < this.rows.length;
    }

    /**
     * 当前行是否为空行（全是非显示字符）
     * @returns
     */
    public isBlankRow() {
        if (this.cursor >= this.rows.length) {
            return true;
        }
        for (const column of this.rows[this.cursor]) {
            const str = String(column).trim();
            if (!isNullOrEmpty(str)) {
                return false;
            }
        }
        return true;
    }

    /**
     * Indicates whether the cursor has reached the end of the rows.
     * @returns {boolean} True if the cursor is at the end, false otherwise.
     */
    public get end(): boolean {
        return this.cursor >= this.rows.length;
    }

    private parseIndex(index: string | number): number {
        if (typeof index === "number") {
            if (index >= this.keys.size) {
                throw new Error(`Index ${index} out of range`);
            }
            return index;
        }
        if (!this.keys.has(index)) {
            // throw new Error(`Key ${index} not found`);
            return -1;
        }
        return this.keys.get(index);
    }
}

const logger = new Logger(ExcelFile.name);
