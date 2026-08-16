import dayjs from 'dayjs';

/** 值班维护天数：指挥开启当日 + 后 4 天 */
export const DUTY_DAY_COUNT = 5;

/**
 * 根据指挥开启时间计算 5 个值班日期（开启当日 + 后 4 天）。
 * 返回 YYYY-MM-DD 数组，长度固定为 5。
 */
export function getDutyDates(startTime: string | Date | number): string[] {
  const start = dayjs(startTime);
  return Array.from({ length: DUTY_DAY_COUNT }, (_, i) =>
    start.add(i, 'day').format('YYYY-MM-DD'),
  );
}

/**
 * 从 5 天值班日期中选出「当前应展示」的日期：
 * - 今天在窗口内 → 返回今天
 * - 今天早于开启日 → 返回第 1 天
 * - 今天晚于第 5 天 → 返回最后 1 天
 */
export function pickCurrentDutyDate(dates: string[]): string {
  if (!dates.length) return '';
  const today = dayjs().format('YYYY-MM-DD');
  if (dates.includes(today)) return today;
  if (today < dates[0]) return dates[0];
  return dates[dates.length - 1];
}

/**
 * 将 list 接口返回的值班数据按日期聚合为：
 * Record<date, Record<department, responsible>>
 * 兼容旧数据（无 date 字段时归入第 1 天）；窗口外的日期忽略。
 */
export function groupDutyByDate(
  items: Extreme.DutyItem[],
  dates: string[],
): Record<string, Record<string, string>> {
  const result: Record<string, Record<string, string>> = {};
  for (const date of dates) {
    result[date] = {};
  }
  for (const item of items) {
    const date = item.date || dates[0];
    if (!(date in result)) continue;
    result[date][item.department] = item.responsible || '';
  }
  return result;
}

/** 日期 YYYY-MM-DD → MM/DD 展示 */
export function formatDutyDate(date: string): string {
  return date.slice(5).replace('-', '/');
}
