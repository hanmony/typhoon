import { Injectable } from '@angular/core';
import { categorizeFilesByName } from '../../../app.util';
import { ActionCategory } from '../../../domain/action.category';
import { ActionDto } from '../../../domain/action.dto';
import { FilterModel } from '../case-detail.component';

export type AlertType =
  | 'red'
  | 'orange'
  | 'yellow'
  | 'blue'
  | 'lift'
  | 'unknown';

export const keyToCategory: Record<string, ActionCategory> = {
  运营事件: ActionCategory.opevent,
  行车措施: ActionCategory.driving,
  客运措施: ActionCategory.transport,
  客运处置: ActionCategory.disposal,
  施工调整: ActionCategory.construction,
};

export const categoryToLabel: Partial<Record<ActionCategory, string>> = {
  [ActionCategory.opevent]: '运营事件',
  [ActionCategory.driving]: '行车措施',
  [ActionCategory.transport]: '客运措施',
  [ActionCategory.disposal]: '客运处置',
  [ActionCategory.construction]: '施工调整',
};

export const globalCategoryToLabel: Partial<Record<ActionCategory, string>> = {
  [ActionCategory.alert]: '预警响应',
  [ActionCategory.weather]: '天气预警',
  [ActionCategory.directive]: '路网指令',
  [ActionCategory.propaganda]: '媒体宣传',
  [ActionCategory.report]: '信息报告',
  [ActionCategory.keynote]: '关键事件',
};

export const allCategoryToLabel: Partial<Record<ActionCategory, string>> = {
  ...categoryToLabel,
  ...globalCategoryToLabel,
};

export const mapEffectActionCategory = {
  ...categoryToLabel,
  [ActionCategory.keynote]: '关键事件',
};

export const globalEventCategories = Object.keys(
  globalCategoryToLabel,
) as ActionCategory[];

export type CategoryEventDto = Map<ActionCategory, ActionDto[]>;

export type LineEventDto = Map<string, ActionDto[]>;

export type SubTypeEventDto = Map<string, ActionDto[]>;

export type TypeEventDto = Map<ActionCategory, SubTypeEventDto>;

export type TimeEventDto = Map<string, CategoryEventDto>;

export interface SerializedEventsDto {
  mapByCategory: CategoryEventDto;
  byTime: ActionDto[];
  mapByLine: LineEventDto; // ! 按照线路分组， 无线路的会忽略
  mapByType: TypeEventDto; // ! 先按照category, 再按 type 分组， 类型不符的会忽略
  globalEvents: ActionDto[];
  localEvents: ActionDto[];
}

const localEventKeys = [
  'lines',
  'opEvents',
  'trafficMeasures',
  'passengerTransportMeasures',
  'passengerDisposals',
  'constructionAdjustments',
] as const;
export type LOCAL_CATEGORY_KEY = (typeof localEventKeys)[number];

export const LOCAL_EVENT_KEYS_MAP: [
  LOCAL_CATEGORY_KEY,
  ActionCategory,
  string,
][] = [
  ['opEvents', ActionCategory.opevent, '事件类型'],
  ['trafficMeasures', ActionCategory.driving, '行车措施'],
  ['passengerTransportMeasures', ActionCategory.transport, '措施'],
  ['passengerDisposals', ActionCategory.disposal, 'unknown'],
  ['constructionAdjustments', ActionCategory.construction, '调整措施'],
];

export const GLOBAL_EVENT_KEYS_MAP: [string, ActionCategory, string][] = [
  ['alerts', ActionCategory.alert, '预警种类'],
  ['directive', ActionCategory.directive, '工作指令'],
  ['propaganda', ActionCategory.propaganda, '发布方式'],
  ['report', ActionCategory.report, '内容'],
  ['keynote', ActionCategory.keynote, '类型'],
];

export const ALL_EVENT_LABEL_MAP = [
  ...GLOBAL_EVENT_KEYS_MAP.map(([_key, category, label]) => {
    return [category, label];
  }),
  ...LOCAL_EVENT_KEYS_MAP.map(([_key, category, label]) => {
    return [category, label];
  }),
];

@Injectable({
  providedIn: 'root',
})
export class UtilsService {
  rawEvents: ActionDto[] = [];
  serializedEventsDto: SerializedEventsDto = {
    mapByCategory: new Map(),
    byTime: [],
    mapByLine: new Map(),
    mapByType: new Map(),
    globalEvents: [],
    localEvents: [],
  };
  constructor() {}
  setRawEvents(rawEvents: ActionDto[]) {
    this.rawEvents = rawEvents;
    this.serializedEventsDto = this.serializeEvents(this.rawEvents);
  }
  separateEventsByCategory(actions: ActionDto[]) {
    const result = new Map<ActionCategory, ActionDto[]>();
    this.sortByTime(actions).forEach((ev) => {
      if (!result.get(ev.category)) {
        result.set(ev.category, [ev]);
      } else {
        result.get(ev.category)!.push(ev);
      }
    });
    return result;
  }
  sortByTime(actions: ActionDto[]) {
    return actions.slice().sort((a, b) => {
      return new Date(a.fromDate).getTime() - new Date(b.fromDate).getTime();
    });
  }
  separateEventsByType(actions: ActionDto[]): TypeEventDto {
    const record = this.separateEventsByCategory(actions);
    const result: TypeEventDto = new Map();
    LOCAL_EVENT_KEYS_MAP.forEach(([_key, category, label]) => {
      const target = record.get(category);
      if (target && target.length) {
        if (!result.get(category)) {
          result.set(category, new Map<string, ActionDto[]>());
        }
        const targetMap = result.get(category)!;
        target.forEach((e) => {
          const type = e.items[label];
          if (!targetMap.get(type)) {
            targetMap.set(type, [e]);
          } else {
            targetMap.get(type)!.push(e);
          }
        });
      }
    });
    return result;
  }
  separateEventsBySubType(actions: ActionDto[]): SubTypeEventDto {
    const result: SubTypeEventDto = new Map();
    LOCAL_EVENT_KEYS_MAP.forEach(([_key, _category, label]) => {
      if (actions && actions.length) {
        actions.forEach((e) => {
          const type = e.items[label];
          if (!type) {
            return;
          }
          if (result.get(type)) {
            result.get(type)!.push(e);
          } else {
            result.set(type, [e]);
          }
        });
      }
    });
    return result;
  }
  serializeEvents(actions: ActionDto[]): SerializedEventsDto {
    const { globalEvents, localEvents } = this.separateGlobalEvents(actions);
    const result: SerializedEventsDto = {
      mapByCategory: this.separateEventsByCategory(actions),
      byTime: this.sortByTime(actions),
      mapByLine: this.separateEventsByLine(actions),
      mapByType: this.separateEventsByType(actions),
      globalEvents,
      localEvents,
    };
    return result;
  }
  separateGlobalEvents(actions: ActionDto[]) {
    const globalEvents: ActionDto[] = [];
    const localEvents: ActionDto[] = [];
    actions.forEach((ev) => {
      if (globalEventCategories.includes(ev.category)) {
        globalEvents.push(ev);
      } else {
        localEvents.push(ev);
      }
    });
    return {
      globalEvents,
      localEvents,
    };
  }
  separateEventsByLine(actions: ActionDto[]): LineEventDto {
    const record = actions.reduce(
      (acc, ev) => {
        const items = ev.items;
        const lineString = items['线路'] || items['线路号'];
        if (lineString) {
          if (!acc[lineString]) {
            acc[lineString] = [];
          }
          acc[lineString].push(ev);
        }
        return acc;
      },
      {} as Record<string, ActionDto[]>,
    );

    const result: LineEventDto = new Map();

    Object.entries(record).forEach(([lineString, evs]) => {
      result.set(lineString, evs);
    });
    return result;
  }
  separateEventsByTime(actions: ActionDto[]): TimeEventDto {
    const temp = new Map<string, ActionDto[]>();
    actions = actions.slice().sort((a, b) => {
      return new Date(a.fromDate).getTime() - new Date(b.fromDate).getTime();
    });
    actions.forEach((ev) => {
      const timeString = this.formatTimeString(ev.fromDate);
      if (!temp.get(timeString)) {
        temp.set(timeString, [ev]);
      } else {
        temp.get(timeString)!.push(ev);
      }
    });
    const result: TimeEventDto = new Map();
    Array.from(temp).map(([k, v]) => {
      result.set(k, this.separateEventsByCategory(v));
    });
    return result;
  }
  getFilteredRawEventsByFilterModel(
    actions: ActionDto[],
    conditions: FilterModel,
  ) {
    return this.getFilteredRawEventsByTypeModel(
      this.getFilteredRawEventsByLineModel(actions, conditions),
      conditions,
    );
  }
  getFilteredRawEventsByLineModel(
    actions: ActionDto[],
    conditions: FilterModel,
  ) {
    const lineResult = [] as ActionDto[];

    const lines =
      conditions['lines'].filter((l) => l.checked).map((e) => e.value) || [];
    actions.forEach((ev) => {
      const items = ev.items;
      const lineString = items['线路'] || items['线路号'];
      if (lineString && lines.find((l) => l === lineString)) {
        lineResult.push(ev);
      }
    });

    return lineResult;
  }
  getFilteredRawEventsByTypeModel(
    actions: ActionDto[],
    conditions: FilterModel,
  ) {
    const result = [] as ActionDto[];
    const disabledItem = [] as string[];
    LOCAL_EVENT_KEYS_MAP.forEach(([key, category, label]) => {
      if (key !== 'lines') {
        const ops = conditions[key];
        ops.forEach((op) => {
          if (!op.checked) {
            disabledItem.push(op.value as string);
          } else {
            result.push(
              ...actions.filter(
                (e) => e.category === category && e.items[label] === op.value,
              ),
            );
          }
        });
      }
    });
    return result;
  }
  getAlertEvents(justColorAlert: boolean = false) {
    const allEvents = this.serializedEventsDto.mapByCategory.get(
      ActionCategory.alert,
    );
    if (!allEvents) return [];
    if (!justColorAlert) return allEvents;
    return allEvents.filter((ev) => {
      const items = ev.items;
      return items['预警种类'] === '气象预警';
    });
  }
  getWeatherEvents() {
    const allWeatherEvents = this.serializedEventsDto.mapByCategory.get(
      ActionCategory.weather,
    );
    if (!allWeatherEvents) return [];
    return allWeatherEvents.slice();
  }
  get alertEvents() {
    return this.getAlertEvents();
  }
  get weatherEvents() {
    return this.getWeatherEvents();
  }
  get colorAlertEvents() {
    return this.getAlertEvents(true);
  }
  filterAlertEvents(evs: ActionDto[]) {
    return evs.filter((ev) => {
      const items = ev.items;
      return items['预警种类'] === '气象预警';
    });
  }
  getLastAlertEvent(evs: ActionDto[]) {
    evs = evs.slice().sort((a, b) => {
      return new Date(a.fromDate).getTime() - new Date(b.fromDate).getTime();
    });
    const alertEvs = this.filterAlertEvents(evs);
    if (!alertEvs.length) return null;
    return alertEvs[alertEvs.length - 1];
  }
  getLastAlertEvents(evs: ActionDto[]) {
    evs = evs.slice().sort((a, b) => {
      return new Date(a.fromDate).getTime() - new Date(b.fromDate).getTime();
    });
    const alertEvs = this.filterAlertEvents(evs);
    return alertEvs;
  }
  getEventsByPeriod(start: string, end: string, source?: ActionDto[]) {
    if (source) {
      source = source.slice().sort((a, b) => {
        return new Date(a.fromDate).getTime() - new Date(b.fromDate).getTime();
      });
    } else {
      source = this.serializedEventsDto.byTime;
    }
    return source.filter((ev, i) => {
      const fromDate = new Date(this.formatTimeString(ev.fromDate)).getTime();
      return (
        fromDate > new Date(start).getTime() &&
        fromDate < new Date(end).getTime()
      );
    });
  }
  getEventsByTime(time: string, source?: ActionDto[]) {
    if (source) {
      source = source.slice().sort((a, b) => {
        return new Date(a.fromDate).getTime() - new Date(b.fromDate).getTime();
      });
    } else {
      source = this.serializedEventsDto.byTime;
    }
    return source.filter((ev, i) => {
      return this.formatTimeString(ev.fromDate) === time;
    });
  }

  getWeatherEventsWithCertainTime(time: string): ActionDto[] {
    const weatherEvents = this.weatherEvents;
    const timeDate = new Date(time);

    const filteredByStartTime = weatherEvents.filter((ev) => {
      const start = new Date(this.formatTimeString(ev.fromDate));
      return start <= timeDate;
    });
    const deduplicatedByType = new Map<string, ActionDto>();
    filteredByStartTime.forEach((w) => {
      deduplicatedByType.set(w.items['类型'], w);
    });

    const filteredByEndTime = Array.from(deduplicatedByType.values()).filter(
      (ev) => {
        const end = new Date(this.formatTimeString(ev.toDate));
        return timeDate < end;
      },
    );

    return filteredByEndTime;
  }
  getWeatherStringsByTime(time: string): string[] {
    const weatherEvents = this.getWeatherEventsWithCertainTime(time);
    return weatherEvents.map((a) => this.getWeatherAlertTypeNew(a));
  }
  formatTimeString(d: Date) {
    if (!d) return '';
    d = new Date(d);
    return `${d.getFullYear()}-${(d.getMonth() + 1)
      .toString()
      .padStart(2, '0')}-${d.getDate().toString().padStart(2, '0')} ${d
      .getHours()
      .toString()
      .padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`;
  }

  formatTimeExcelTime(d: Date | string): number {
    if (!d) return 0;

    const date = new Date(d);
    if (isNaN(date.getTime())) return 0;

    // Excel 日期序列值（1900年1月1日为1）
    const excelEpoch = new Date(1899, 11, 30); // 注意：月份从0开始，11表示12月
    const diffInMs = date.getTime() - excelEpoch.getTime();
    const excelSerial = diffInMs / (1000 * 60 * 60 * 24);

    return excelSerial;
  }

  getWeatherAlertType(e: ActionDto): AlertType {
    return this.getWeatherColor(e);
  }
  getWeatherType(e: ActionDto): string {
    const typeTextString = e.items['类型'];
    switch (typeTextString) {
      case '台风':
        return 'typhoon';
      case '暴雨':
        return 'rain';
      case '暴雪':
        return 'snow';
      case '寒潮':
        return 'cold';
      case '大风':
        return 'wind';
      case '低温':
        return 'low';
      case '高温':
        return 'high';
      case '雷电':
        return 'thunder';
      case '大雾':
        return 'fog';
      case '霾':
        return 'haze';
      case '冰雹':
        return 'hailstone';
      case '道路结冰':
        return 'roadIcy';
      case '霜冻':
        return 'frost';
      default:
        return 'unknown';
    }
  }
  getWeatherColor(e: ActionDto): AlertType {
    const message = e.items['等级'];
    if (message.indexOf('蓝色') !== -1) {
      return 'blue';
    } else if (message.indexOf('黄色') !== -1) {
      return 'yellow';
    } else if (message.indexOf('橙色') !== -1) {
      return 'orange';
    } else if (message.indexOf('红色') !== -1) {
      return 'red';
    } else if (message.indexOf('解除') !== -1) {
      return 'lift';
    } else {
      return 'unknown';
    }
  }
  getWeatherAlertTypeNew(e: ActionDto): string {
    const subType = this.getWeatherType(e);
    const degree = this.getWeatherColor(e);
    return `${subType}-${degree}`;
  }
  getSubType(ev: ActionDto) {
    const target = ALL_EVENT_LABEL_MAP.find(([key]) => key === ev.category);
    if (!target) return '';
    const typeText = target[1];
    const typeValue = ev.items[typeText];
    return typeValue || '';
  }
  getLocalEventSubType(ev: ActionDto) {
    const label = LOCAL_EVENT_KEYS_MAP.find((e) => e[1] === ev.category)?.[2];
    if (!label) return '';
    const items = ev.items;
    return items[label];
  }
  getLocalEventStations(ev: ActionDto) {
    const commonCell = (ev: ActionDto) => {
      const zoneStart = ev.items['起始车站'];
      const zoneEnd = ev.items['终止车站'];
      if (zoneStart && zoneEnd) {
        if (zoneStart === zoneEnd) {
          return zoneStart;
        }
        return [zoneStart, zoneEnd];
      }
      return '';
    };
    switch (ev.category) {
      case ActionCategory.opevent: {
        const locationType = ev.items['类型'];
        const locationLabel = ev.items[locationType];
        const zoneStart = ev.items['区间起始车站'];
        const zoneEnd = ev.items['区间终止车站'];
        if (locationType !== '区间') {
          return locationLabel ? [locationLabel] : [];
        }
        if (zoneStart && zoneEnd) {
          if (zoneStart === zoneEnd) {
            return zoneStart;
          }
          return [zoneStart, zoneEnd];
        }
        return '';
      }
      case ActionCategory.driving:
        return commonCell(ev);

      case ActionCategory.transport:
        return commonCell(ev);
      case ActionCategory.disposal:
        return ev.items['车站'] || '';
      case ActionCategory.construction:
        return '';
      case ActionCategory.keynote:
        return commonCell(ev);
      default:
        return '';
    }
  }
  filterEventsByTimeSlice(
    time: string,
    currentCategory: ActionCategory,
    events: ActionDto[],
  ) {
    const startDate = new Date(time);
    const passedEvents = events.filter((ev) => {
      const fromDate = new Date(this.formatTimeString(ev.fromDate));
      const toDate = new Date(this.formatTimeString(ev.toDate));
      return (
        fromDate.getTime() < startDate.getTime() &&
        toDate.getTime() > startDate.getTime()
      );
    });
    const alerts = this.filterAlertEvents(events).filter((ev) => {
      const fromDate = new Date(this.formatTimeString(ev.fromDate));
      const toDate = new Date(this.formatTimeString(ev.toDate));
      return (
        fromDate.getTime() <= startDate.getTime() &&
        toDate.getTime() > startDate.getTime()
      );
    });
    let currentEvents: ActionDto[] = [];
    const keys = [
      ...LOCAL_EVENT_KEYS_MAP.map((e) => e[1]),
      ActionCategory.keynote,
    ];
    const localKeyIndex = keys.indexOf(currentCategory);
    if (localKeyIndex === -1) {
      currentEvents = [];
    } else {
      currentEvents = events.filter((ev) => {
        const fromDate = new Date(this.formatTimeString(ev.fromDate));
        if (fromDate.getTime() === startDate.getTime()) {
          const curKeyIndex = keys.indexOf(ev.category);
          return curKeyIndex <= localKeyIndex;
        } else {
          return false;
        }
      });
    }
    return [...passedEvents, ...alerts, ...currentEvents];
  }
  isKeyEvent(ev: ActionDto) {
    const { items } = ev;
    if (!items) return false;

    if (ev.category === ActionCategory.keynote) {
      return true;
    }
    return false;
  }
  shouldOmitNotice(ev: ActionDto) {
    const { items } = ev;
    if (!items) return false;
    if (['不提示', '否', '不'].includes(items['重点提示'])) {
      return true;
    }
    return false;
  }
  hasAccessory(ev: ActionDto) {
    const as = ev.accessories;
    const { video, audio, image } = categorizeFilesByName(as);
    return video.length > 0 || audio.length > 0 || image.length > 0;
  }
}
