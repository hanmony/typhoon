import * as dayjs from "dayjs";
import * as customParseFormat from "dayjs/plugin/customParseFormat";

dayjs.extend(customParseFormat);

/**
 * 等待指定秒数
 * @param seconds
 * @returns
 */
export async function waitForSeconds(seconds: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, seconds * 1000));
}

/**
 * 等待指定条件变为TRUE
 * @param condition
 */
export async function waitUntil(condition: () => boolean): Promise<void> {
    while (!condition()) {
        await waitForSeconds(0.1);
    }
}

export function getCurrentLineString(lines: string[]): string {
    return lines.map(i => i.replace("号线", "")).join("/") + "号线";
}

/**
 * Convert YYYYMMDD to Date
 * @param date YYYYMMDD
 */
export function fromShortDate(date: string | number): Date {
    const d = dayjs(String(date), "YYYYMMDD");
    return d.toDate();
}

/**
 * Converts a short date string to yesterday's date.
 * @param date - The short date string in the format "YYYYMMDD".
 * @returns The Date object representing yesterday's date.
 */
export function fromShortDateGetYesterday(date: string): Date {
    const d = dayjs(date, "YYYYMMDD");
    return d.add(-1, "day").toDate();
}

/**
 * Converts a short date string to a Date object representing tomorrow's date.
 * @param date - The short date string in the format "YYYYMMDD".
 * @returns A Date object representing tomorrow's date.
 */
export function fromShortDateGetTommorow(date: string | number): Date {
    const d = dayjs(date, "YYYYMMDD");
    return d.add(1, "day").toDate();
}

export function fromShortDateGetMonthDay(date: string | number): string {
    const d = dayjs(String(date), "YYYYMMDD");
    const dDate = d.toDate();
    return dDate.getMonth() + 1 + "月" + dDate.getDate() + "日";
}

/**
 * Convert Date to YYYYMMDD
 * @param date
 */
export function toShortDate(date: Date): string {
    const d = dayjs(date);
    return d.format("YYYYMMDD");
}

/**
 * Converts a Date object to a short date number (YYYYMMDD).
 * @param date - The Date object to be converted.
 * @returns The short date number.
 */
export function toShortDateNumber(date: Date): number {
    return Number(toShortDate(date));
}

/**
 * 获取每个月的最后一天
 * @param year
 * @param month
 * @returns
 */
export function getLastDayOfMonth(year: number, month: number) {
    const date = new Date(year, month, 0);
    return date.getDate();
}

/**
 * Checks if a string consists of only numeric characters.
 *
 * @param str - The string to be checked.
 * @returns True if the string consists of only numeric characters, false otherwise.
 */
export function isNumberString(str: string): boolean {
    return /^\d+$/.test(str);
}

// supress eslint warning
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function dummy(...args: unknown[]): void {
    // do nothing
}

export function getLastMonthStartAndEnd(date: Date = new Date()): { startDate: Date; endDate: Date } {
    let year = date.getFullYear();
    let month = date.getMonth();
    if (month === 0) {
        month = 11;
        year = year - 1;
    } else {
        month = month - 1;
    }
    return {
        startDate: new Date(year, month, 1),
        endDate: new Date(year, month + 1, 0),
    };
}

export function dateMonthStart(date: Date = new Date()): Date {
    return new Date(date.getFullYear(), date.getMonth(), 1);
}
export function dateMonthEnd(date: Date = new Date()): Date {
    return new Date(date.getFullYear(), date.getMonth() + 1, 0);
}

export function getYesterdayMidnight(): Date {
    const now = new Date();
    const yesterday = new Date(now);
    yesterday.setDate(now.getDate() - 1); // 设置为昨天
    yesterday.setHours(0, 0, 0, 0); // 设置为零点
    return yesterday;
}

export function getTodayMidnight(): Date {
    const now = new Date();
    const today = new Date(now);
    today.setHours(0, 0, 0, 0); // 设置为零点
    return today;
}

export function getTomorrowMidnight(): Date {
    const now = new Date();
    const tomorrow = new Date(now);
    tomorrow.setDate(now.getDate() + 1); // 设置为明天
    tomorrow.setHours(0, 0, 0, 0); // 设置为零点
    return tomorrow;
}

export function isImageFile(filename: string): boolean {
    const dot = filename.lastIndexOf(".");
    if (dot < 0) {
        return false;
    }
    const extension = filename.substring(dot + 1).toLowerCase();
    return ["png", "jpg", "jpeg", "bmp", "svg"].includes(extension);
}

export function getFirstDateOfWeek(date: Date = new Date()): Date {
    const day = date.getDay();
    const diff = date.getDate() - day + (day === 0 ? -6 : 1);
    return new Date(date.setDate(diff));
}

export function getLastDateOfWeek(date: Date = new Date()): Date {
    const day = date.getDay();
    const diff = date.getDate() - day + (day === 0 ? -6 : 1);
    return new Date(date.setDate(diff + 6));
}

export function formatNumber(number: number, decimalPlaces: number): string {
    const formatter = new Intl.NumberFormat("en-US", {
        minimumFractionDigits: 0,
        maximumFractionDigits: decimalPlaces,
    });
    return formatter.format(number);
}

/**
 * 将日期排序
 * @param date1
 * @param date2
 */
export function normalizeDate(date1: Date, date2: Date): Date[] {
    const tmp = new Date(date1);
    if (date1.getTime() > date2.getTime()) {
        date1 = new Date(date2);
        date2 = new Date(tmp);
    }
    return [date1, date2];
}
