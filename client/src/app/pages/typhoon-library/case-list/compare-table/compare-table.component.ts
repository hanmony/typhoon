import { Component, inject } from '@angular/core';
import { NZ_MODAL_DATA, NzModalRef, NzModalService } from 'ng-zorro-antd/modal';
import { ActionCategory } from '../../../../domain/action.category';
import { ActionDto } from '../../../../domain/action.dto';
import { CaseDto } from '../../../../domain/case.dto';
import { LibraryNzModule } from '../../../../library.nz.module';
import { ApiService } from '../../../../services/api.service';
import { Typhoon } from '../../../case-detail/services/classes/typhoon.class';
import { LocalEventReactService } from '../../../case-detail/services/local-event-react.service';
import {
  ITyphoonData,
  transferPathInfosToTyphoonMeta,
} from '../../../case-detail/services/meta';
import {
  AlertType,
  UtilsService,
} from '../../../case-detail/services/utils.service';
import {
  CompareHaltTableComponent,
  IHaltModalData,
} from '../compare-halt-table/compare-halt-table.component';
import { EvaluationTextComponent } from './evaluation-text/evaluation-text.component';
import { PathCellComponent } from './path-cell/path-cell.component';

export interface ICompareModalData {
  caseIds: string[];
}

export interface ICompareItemData {
  id: string;
  detail?: CaseDto;
  typhoonMeta?: ITyphoonData;
  typhoonInstance?: Typhoon;
  events: ActionDto[];
  evaluation?: {
    timeliness: number;
    reasonability: number;
    overallRating: string;
    text: string;
  };
}
interface Column {
  label: string;
  key: string;
  highestColor?: string;
  alignLeft?: boolean;
  clickConfig?: {
    clickable: (item: ICompareItemData) => boolean;
    getContent: (item: ICompareItemData) => string;
  };
  tmp?: string;
  valueGetter?: (item: ICompareItemData) => string;
}
interface Section {
  label: string;
  key: string;
  columns: Column[];
}

const weiBoValueGetter = (item: ICompareItemData) => {
  if (!item.detail) return '';
  const { events } = item;
  const filteredEvents = events.filter(
    (event) =>
      event.category === ActionCategory.propaganda &&
      event.items['发布方式'] === '微博',
  );
  return filteredEvents.length + '' || '0';
};

const weiXinValueGetter = (item: ICompareItemData) => {
  if (!item.detail) return '';
  const { events } = item;
  const filteredEvents = events.filter(
    (event) =>
      event.category === ActionCategory.propaganda &&
      event.items['发布方式'] === '微信',
  );
  return filteredEvents.length + '' || '0';
};

const postValueGetter = (item: ICompareItemData) => {
  if (!item.detail) return '';
  const { events } = item;
  const filteredEvents = events.filter(
    (event) =>
      event.category === ActionCategory.propaganda &&
      (event.items['发布方式'] === '电视直播' ||
        event.items['发布方式'] === '上视采访'),
  );
  return filteredEvents.length + '' || '0';
};

const getHaltLineSet = (item: ICompareItemData) => {
  if (!item.detail) return new Set<string>();
  const { events } = item;
  const filteredEvents = events.filter(
    (event) =>
      event.category === ActionCategory.driving &&
      event.items['行车措施'] === '停运',
  );
  return new Set(filteredEvents.map((event) => event.items['线路号']));
};

const haltValueGetter = (item: ICompareItemData) => {
  if (!item.detail) return '';
  const lineSet = getHaltLineSet(item);
  return lineSet.size ? lineSet.size + '条线' : '-';
};

const sections: Section[] = [
  {
    label: '台风详情',
    key: '台风详情',
    columns: [
      { label: '台风年度', key: '台风年度' },
      { label: '台风名称', key: '台风命名' },
      { label: '英文名称', key: '英文名称' },
      { label: '台风类别', key: '台风类型' },
      { label: '台风编号', key: '台风编号' },
      { label: '最大风力', key: '台风最大风力', highestColor: '#7dd3fc' },
      { label: '台风产生时间', key: '发生时间' },
      { label: '最高预警等级', key: '台风最大预警等级', tmp: 'alert' },
      { label: '影响时长', key: '影响上海时长', highestColor: '#7dd3fc' },
      { label: '影响日期', key: '影响日期' },
      { label: '"六停”、“三停”情况', key: '"六停”、“三停”情况' },
    ],
  },
  {
    label: '工作部署',
    key: '工作部署',
    columns: [{ label: '发布指令', key: '发布指令', alignLeft: true }],
  },
  {
    label: '运行措施',
    key: '运行措施',
    columns: [
      { label: '预警信息', key: '预警信息', alignLeft: true },
      { label: '停运形式', key: '停运形式' },
      {
        label: '停运路线',
        key: '停运线路数',
        tmp: 'halt',
        highestColor: '#f87171',
        valueGetter: haltValueGetter,
        clickConfig: {
          clickable: (item) => {
            const lineSet = getHaltLineSet(item);
            return lineSet.size > 0;
          },
          getContent: (item) => {
            const lineSet = getHaltLineSet(item);
            return Array.from(lineSet).join('、');
          },
        },
      },
      {
        key: '施工调整',
        label: '施工调整',
        highestColor: '#7dd3fc',
      },
      {
        key: '突发事件',
        label: '突发事件',
        // highestColor: '#7dd3fc',
      },
      {
        key: '重要影响事件',
        label: '重要影响事件',
        // highestColor: '#f87171',
      },
    ],
  },
  {
    label: '对外情况',
    key: '对外情况',
    columns: [
      { key: '热线接听总量', label: '热线接听', highestColor: '#079e00' },
      { key: '人工接听总量', label: '人工接听', highestColor: '#079e00' },
      { key: '台风相关咨询建议', label: '咨询建议', highestColor: '#079e00' },
      { key: '舆情概况', label: '舆情' },
      { key: '官方微博', label: '官方微博', valueGetter: weiBoValueGetter },
      { key: '官方微信', label: '官方微信', valueGetter: weiXinValueGetter },
      { key: '直播、采访', label: '直播、采访', valueGetter: postValueGetter },
    ],
  },
  {
    label: '评价',
    key: '评价',
    columns: [{ key: '处置评价', label: '处置评价', alignLeft: true }],
  },
];

@Component({
  selector: 'compare-table',
  imports: [LibraryNzModule, PathCellComponent, EvaluationTextComponent],
  templateUrl: './compare-table.component.html',
  styleUrl: './compare-table.component.less',
})
export class CompareTableComponent {
  readonly #modal = inject(NzModalRef);
  readonly nzModalData: ICompareModalData = inject(NZ_MODAL_DATA);

  sections = sections;
  tableData: ICompareItemData[] = Array.from(
    { length: 4 },
    this.getEmptyItemData,
  );

  evaluationTextVisible = false;
  evaluationText = ``;

  constructor(
    private readonly apis: ApiService,
    private modal: NzModalService,
    private readonly utils: UtilsService,
    private readonly react: LocalEventReactService,
  ) {}
  getEmptyItemData(): ICompareItemData {
    return {
      id: '',
      events: [],
      detail: undefined,
      typhoonMeta: undefined,
      typhoonInstance: undefined,
    };
  }
  ngAfterViewInit() {
    this.init();
  }
  async init() {
    const list = await Promise.all(
      this.nzModalData.caseIds.map((id) => this.fetchData(id)),
    );
    this.tableData = this.tableData.map((item, index) => {
      return {
        ...item,
        ...list[index],
      };
    });
    this.tableData.forEach((item) => {
      this.apis.manager.getEvents(item.id, '').then((events) => {
        item.events = events;
      });
    });
  }
  toggleValuationTextVisible() {
    this.evaluationTextVisible = !this.evaluationTextVisible;
  }
  fetchData(caseId: string): Promise<Partial<ICompareItemData>> {
    return new Promise(async (resolve) => {
      const detail = await this.apis.manager.getCase(caseId);
      const pathInfos = await this.apis.manager.getPathInfos(detail.name);
      const typhoonMeta = transferPathInfosToTyphoonMeta(pathInfos, detail);
      const result: Partial<ICompareItemData> = {
        id: caseId,
        detail,
        typhoonMeta,
        typhoonInstance: new Typhoon({
          meta: typhoonMeta,
          omitLine: true,
        }),
        evaluation: this.generateEvaluationDto(detail),
      };
      resolve(result);
    });
  }
  generateEvaluationDto(detail: CaseDto): ICompareItemData['evaluation'] {
    const onTimeValue = this.getValue(detail, '及时性');
    const reasonableValue = this.getValue(detail, '合理性');
    const text = this.getValue(detail, '评价文本');
    const overallRating = this.getValue(detail, '总体评价');

    return {
      text,
      timeliness: parseInt(onTimeValue) || 0,
      reasonability: parseInt(reasonableValue) || 0,
      overallRating: (overallRating || '').slice(0, 1),
    };
  }
  getCaseField(key: string, rowDetail?: CaseDto) {
    if (!rowDetail) {
      return '';
    }
    const item = rowDetail.values[key];
    if (item) {
      return item.value || '';
    } else {
      return '';
    }
  }
  isHighest(column: Column, index: number) {
    const { key, valueGetter } = column;
    const isAllEmpty = this.tableData.map((e) => e.id).join('') === '';
    if (isAllEmpty) {
      return false;
    }
    const values = this.tableData
      .map((item) => {
        if (valueGetter) {
          return parseFloat(valueGetter(item));
        }
        return parseFloat(this.getCaseField(key, item.detail));
      })
      .filter((item) => {
        return !isNaN(item);
      });
    const max = Math.max(...values);
    if (!max) {
      return false;
    }
    const maxIndex = values.indexOf(max);
    return maxIndex === index;
  }
  getValue(item?: CaseDto, key?: string) {
    if (!item || !key) {
      return '';
    }
    const value = item.values[key];
    if (value) {
      return value.value || '';
    } else {
      return '';
    }
  }
  formatExcelDate(number: number) {
    const mis = (number - 25569) * 24 * 60 * 60 * 1000;
    const d = new Date(mis);
    return (
      d.getFullYear() + '年' + (d.getMonth() + 1) + '月' + d.getDate() + '日'
    );
  }
  getTimeText(item?: CaseDto) {
    const timeText = this.getValue(item, '发生时间');
    if (!timeText) return '';
    if (!isNaN(Number(timeText))) {
      return this.formatExcelDate(Number(timeText));
    }
    return timeText;
  }
  getWeatherAlertTypeByCase(e: CaseDto): AlertType {
    const message = e.values['台风最大预警等级']?.value || '';
    if (message.indexOf('蓝色预警') !== -1) {
      return 'blue';
    } else if (message.indexOf('黄色预警') !== -1) {
      return 'yellow';
    } else if (message.indexOf('橙色预警') !== -1) {
      return 'orange';
    } else if (message.indexOf('红色预警') !== -1) {
      return 'red';
    } else if (message.indexOf('逐级解除') !== -1) {
      return 'lift';
    } else {
      return 'unknown';
    }
  }
  getWeatherIcon(item?: CaseDto) {
    if (!item) return '';
    return (
      'assets/images/map/marker/typhoon-alert-' +
      this.getWeatherAlertTypeByCase(item) +
      '.png'
    );
  }
  getRowSpan(section: Section) {
    return section.columns.length + (section.label === '运行措施' ? 1 : 0);
  }
  getRandom() {
    const range = [0, 1, 2];
    return range[Math.floor(Math.random() * range.length)];
  }
  onCellContentClick(column: Column, data: ICompareItemData) {
    if (column.tmp === 'halt') {
      if (column.clickConfig?.clickable(data)) {
        this.createHaltModal(data);
      }
    }
  }
  createHaltModal(data: ICompareItemData): void {
    this.modal.create<CompareHaltTableComponent, IHaltModalData>({
      nzContent: CompareHaltTableComponent,
      nzClassName: 'compare-modal',
      nzWrapClassName: 'custom-scroll-bar',
      nzClosable: true,
      nzData: {
        events: data.events,
      },
      nzWidth: '70vw',
      nzFooter: null,
    });
  }
  getHaltLine(ev: ActionDto) {
    return ev.items['线路号'];
  }
  getTime(ev: ActionDto) {
    const dateFormatter = (d: Date) => {
      d = new Date(d);
      let str = `${d.getMonth() + 1}月${d.getDate()}日`;
      const hours = d.getHours();
      const minutes = d.getMinutes();
      if (hours > 0) {
        str += `${d.getHours()}时`;
        if (minutes > 0) {
          str += `${d.getMinutes()}分`;
        }
      } else {
        if (minutes > 0) {
          str += `0时${d.getMinutes()}分`;
        }
      }
      return str;
    };
    if ((ev.toDate as unknown as string) === '2999-12-31T16:00:00.000Z') {
      return dateFormatter(ev.fromDate);
    }
    return dateFormatter(ev.fromDate) + ' - ' + dateFormatter(ev.toDate);
  }
  getWeekday(ev: ActionDto) {
    const formDateString = this.utils.formatTimeString(ev.fromDate);
    const chineseTranslations = ['日', '一', '二', '三', '四', '五', '六'];
    const date = new Date(formDateString).getDay();
    return `星期${chineseTranslations[date]}`;
  }
  getLocation(ev: ActionDto) {
    return this.react.getLocations(ev);
  }
}
