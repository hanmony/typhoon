import * as dayjs from "dayjs";
import { ExcelColumn } from "src/common/service/excel/excel.file";

import * as customParseFormat from "dayjs/plugin/customParseFormat";

dayjs.extend(customParseFormat);

function excelSimpleDateParser(raw: string): Date {
    const eternal = new Date(3000, 0);
    if (!raw) {
        return eternal;
    }

    const date = dayjs(raw, "MM月DD日HH时");
    if (date.isValid()) {
        return date.toDate();
    } else {
        return undefined;
    }
}

function excelLongitudeParser(raw: string): number {
    if (!raw) {
        return 0;
    }
    const numbers = raw.match(/\d+(\.\d+)?/g).map(Number);
    return numbers[0];
}

function excelLatitudeParser(raw: string): number {
    if (!raw) {
        return 0;
    }
    const numbers = raw.match(/\d+(\.\d+)?/g).map(Number);
    return numbers[1];
}

export class ExcelPathInfoDto {
    // 时间点
    @ExcelColumn("时间", excelSimpleDateParser)
    time: Date = new Date();
    // 经度
    @ExcelColumn("中心位置", excelLongitudeParser)
    longitude: number = 0;
    // 纬度
    @ExcelColumn("中心位置", excelLatitudeParser)
    latitude: number = 0;
    // 风力风速
    @ExcelColumn("风速风力")
    power: string = "";
    // 中心气压
    @ExcelColumn("中心气压")
    pressure: string = "";
    // 风圈半径
    @ExcelColumn("风圈半径（公里）")
    radius: string = "";
    // 登陆信息
    @ExcelColumn("登陆信息")
    landing: string = "";
}
