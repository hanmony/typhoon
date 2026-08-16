import { Component, Input } from '@angular/core';
import { ActionCategory } from '../../../domain/action.category';
import { ActionDto } from '../../../domain/action.dto';
import { LibraryNzModule } from '../../../library.nz.module';
import { INoticeNode } from '../services/auto-play.service';
import {
  ALL_EVENT_LABEL_MAP,
  UtilsService,
  allCategoryToLabel,
} from '../services/utils.service';

interface NotificationData extends INoticeNode {}

interface IContentItem {
  isArray?: boolean;
  value?: string;
  array?: IContentItem[];
  highlight?: boolean;
  separator?: string;
}

const noticeTypeMapping: Partial<
  Record<ActionCategory, 'info' | 'warning' | 'green'>
> = {
  [ActionCategory.alert]: 'warning',
  [ActionCategory.directive]: 'warning',
  [ActionCategory.propaganda]: 'green',
  [ActionCategory.report]: 'green',
  [ActionCategory.opevent]: 'info',
  [ActionCategory.driving]: 'info',
  [ActionCategory.transport]: 'info',
  [ActionCategory.disposal]: 'info',
  [ActionCategory.construction]: 'info',
};

@Component({
  selector: 'notification-template',
  imports: [LibraryNzModule],
  templateUrl: './notification-template.component.html',
  styleUrl: './notification-template.component.less',
})
export class NotificationTemplateComponent {
  content: IContentItem[] = [];
  @Input() data!: NotificationData;

  constructor(private readonly utils: UtilsService) {}
  ngOnInit() {
    this.setContent();
  }
  getEventSubType(ev: ActionDto) {
    const map = ALL_EVENT_LABEL_MAP.find((item) => item[0] === ev.category);
    if (!map) return '';
    const keyLabel = map[1];
    if (!keyLabel) return '';
    return ev.items[keyLabel] || '';
  }
  setContent() {
    if (this.data.type === 'single') {
      this.setSingleNodeContent();
    } else if (this.data.type === 'compose') {
      this.setComposeNodeContent();
    }
  }
  setSingleNodeContent() {
    const ev = this.firstEv;
    switch (ev.category) {
      case ActionCategory.alert:
        this.content = this.getAlertContent(ev);
        break;
      case ActionCategory.directive:
        this.content = this.getDirectiveContent(ev);
        break;
      case ActionCategory.propaganda:
        this.content = this.getPropagandaContent(ev);
        break;
      case ActionCategory.report:
        this.content = this.getReportContent(ev);
        break;
      case ActionCategory.opevent:
        this.content = this.getOperationContent(ev);
        break;
      case ActionCategory.driving:
        this.content = this.getDrivingContent(ev);
        break;
      case ActionCategory.transport:
        this.content = this.getTransportContent(ev);
        break;
      case ActionCategory.disposal:
        this.content = this.getDisposalContent(ev);
        break;
      case ActionCategory.construction:
        this.content = this.getConstructionContent(ev);
        break;
      default:
        break;
    }
  }
  getPropagandaContent(ev: ActionDto) {
    const content: IContentItem[] = [
      { value: this.getEventTimeString(ev) },
      { value: ev.items['发布方式'] },
      { value: ev.items['内容'] },
    ];
    return content;
  }
  getReportContent(ev: ActionDto) {
    const content: IContentItem[] = [
      { value: this.getEventTimeString(ev) },
      { value: ev.items['种类'] + ' — ' + ev.items['报送范围'] },
      { value: ev.items['内容'] },
    ];
    return content;
  }
  getOperationContent(ev: ActionDto) {
    let location = '';
    const l1 = ev.items['车站'];
    const l2 = ev.items['基地/控制中心'];
    if (l1) {
      location = `车站 — ${l1}`;
    } else if (l2) {
      location = `基地/控制中心 — ${l2}`;
    } else {
      location = `区间 — ${ev.items['区间起始车站']} - ${ev.items['区间终止车站']}`;
    }
    const content: IContentItem[] = [
      { value: this.getEventTimeString(ev) },
      { value: location },
      { value: this.getEventSubType(ev), highlight: true },
      { value: ev.items['备注'] },
    ];
    return content;
  }
  getTransportContent(ev: ActionDto) {
    const content: IContentItem[] = [
      { value: this.getEventTimeString(ev) },
      { value: ev.items['线路号'] },
      { value: ` ${ev.items['起始车站']} - ${ev.items['终止车站']}` },
      { value: this.getEventSubType(ev), highlight: true },
    ];
    return content;
  }
  getDisposalContent(ev: ActionDto) {
    const content: IContentItem[] = [
      { value: this.getEventTimeString(ev) },
      { value: ev.items['线路号'] },
      {
        value: `${ev.items['起始车站']} - ${ev.items['终止车站']}`,
      },
      { value: this.getEventSubType(ev), highlight: true },
    ];
    return content;
  }
  getDrivingContent(ev: ActionDto) {
    const content: IContentItem[] = [
      { value: this.getEventTimeString(ev) },
      {
        value: `${ev.items['起始车站']} - ${ev.items['终止车站']}`,
      },
      {
        isArray: true,
        array: [
          { value: ev.items['线路号'], separator: ' — ' },
          { value: this.getEventSubType(ev), highlight: true },
        ],
      },
      { value: ev.items['备注'] },
    ];
    return content;
  }
  getAlertContent(ev: ActionDto) {
    const content: IContentItem[] = [
      { value: this.getEventTimeString(ev) },
      { value: this.getEventSubType(ev), highlight: true },
      { value: ev.items['预警发布'] },
    ];
    return content;
  }
  getDirectiveContent(ev: ActionDto) {
    const content: IContentItem[] = [
      { value: this.getEventTimeString(ev) },
      { value: ev.items['发布单位/部门'] },
      { value: ev.items['工作指令'] },
      { value: ev.items['工作要点'] },
    ];
    return content;
  }
  getConstructionContent(ev: ActionDto) {
    const content: IContentItem[] = [
      { value: this.getEventTimeString(ev) },
      {
        isArray: true,
        array: [
          { value: ev.items['线路'], separator: ' — ' },
          { value: this.getEventSubType(ev), highlight: true },
          { value: ev.items['施工数量'] },
        ],
      },
    ];
    return content;
  }
  getEventTimeString(ev: ActionDto) {
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
  setComposeNodeContent() {
    const evs = this.data.data;
    let count = evs.length;
    if (evs[0].category === ActionCategory.construction) {
      const evs = this.data.data;
      count = evs.reduce((acc, cur) => {
        return acc + Number(cur.items['施工数量']) || 0;
      }, 0);
    }
    const content: IContentItem[] = [
      { value: this.getEventTimeString(this.firstEv) },
      {
        isArray: true,
        array: [
          { value: this.getEventSubType(this.firstEv), highlight: true },
          { value: count + ' 起' },
        ],
      },
    ];
    this.content = content;
    return content;
  }
  get type() {
    return noticeTypeMapping[this.firstEv.category] || 'info';
  }
  get color() {
    switch (this.type) {
      case 'info':
        return '#1890ff';
      case 'warning':
        return '#faad14';
      case 'green':
        return '#52c41a';
      default:
        return '#1890ff';
    }
  }
  get eventTitle() {
    return allCategoryToLabel[this.firstEv.category];
  }
  get firstEv() {
    return this.data.data[0];
  }
  get iconType() {
    return 'exclamation-circle';
  }
}
