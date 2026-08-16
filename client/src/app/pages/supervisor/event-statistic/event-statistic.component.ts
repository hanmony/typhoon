import {
  Component,
  computed,
  effect,
  input,
  output,
  signal,
} from '@angular/core';
import dayjs from 'dayjs';
import { NzToolTipModule } from 'ng-zorro-antd/tooltip';
import { interval, Subscription } from 'rxjs';
import { horizontalInOutReverse } from '../../../common.animation';
import { ApiService } from '../../../services/api.service';
import {
  getEventRepairStateColor,
  getEventRepairStateText,
  occEventCategoryMap,
  occEventTypes,
} from '../../occ/occ.const';

interface EventWithPast extends ExtremeOcc.Event {
  past: boolean;
}

@Component({
  selector: 'supervisor-event-statistic',
  imports: [NzToolTipModule],
  templateUrl: './event-statistic.component.html',
  styleUrl: './event-statistic.component.less',
  animations: [horizontalInOutReverse],
})
export class EventStatisticComponent {
  visible = input(false);
  onClose = output<void>();
  events = input<ExtremeOcc.Event[]>([]);
  passTime = signal('');
  composedEvents = computed<EventWithPast[]>(() => {
    const passTime = this.passTime();
    const past = passTime
      ? !!(new Date().getTime() - new Date(passTime).getTime())
      : false;
    return this.events().map((e) => ({
      ...e,
      past,
    }));
  });
  close() {
    this.onClose.emit();
  }
  categories = [
    {
      name: '全部事件',
      key: 'all',
    },
    {
      name: '侵限事件',
      key: 'encroachment',
    },
    {
      name: '积水事件',
      key: 'waterLogging',
    },
    {
      name: '设备故障',
      key: 'equipmentFailure',
    },
    {
      name: '列车故障',
      key: 'trainFailure',
    },
    {
      name: '基地事件',
      key: 'base',
    },
    {
      name: '其他事件',
      key: 'other',
    },
  ];
  currentCategoryKey = signal('all');
  onCategoryChange(cate: string) {
    this.currentCategoryKey.set(cate);
    this.currentSubTypeKey.set('all');
    this.setFinalTableData();
  }
  eventTypeKeyMap: Record<string, string[]> = {
    all: occEventTypes.slice(),
    ...occEventCategoryMap,
  };
  // currentSubTypes = [
  //   {
  //     label: '全部',
  //     value: 'all',
  //   },
  // ];
  currentSubTypes = computed(() => {
    const category = this.currentCategoryKey();
    return [
      {
        label: '全部',
        value: 'all',
      },
      ...this.eventTypeKeyMap[category].map((key) => {
        return {
          label: key,
          value: key,
        };
      }),
    ];
  });
  onSubTypeChange(subType: string) {
    this.currentSubTypeKey.set(subType);
    this.setFinalTableData();
  }
  currentSubTypeKey = signal('all');
  columns = [
    { label: '重点', key: 'severity', width: 48 },
    { label: '线路', key: 'line', width: 90 },
    { label: '地点', key: 'location' },
    { label: '上下行', key: 'direction', width: 84 },
    { label: '发生时间', key: 'startTime', width: 120 },
    { label: '抢修状态', key: 'repairStatus', width: 100 },
    { label: '过境前后', key: 'passing', width: 84 },
    { label: '事件类型', key: 'type', width: 84 },
    { label: '事件详情', key: 'detail', width: 144 },
  ];
  finalTableData: EventWithPast[] = [];

  interval$ = interval(30000);
  fetchSub$?: Subscription;
  constructor(private api: ApiService) {
    effect(() => {
      this.setFinalTableData();
    });
    this.fetchSub$ = this.interval$.subscribe(() => {
      this.fetchPassTime;
    });
  }
  fetchPassTime() {
    this.api.extreme
      .getPassTime()
      .then((data) => {
        if (Array.isArray(data)) {
          const [t] = data;
          this.passTime.set(t || '');
        }
      })
      .catch(() => {
        this.passTime.set('');
      })
      .finally(() => {
        this.setFinalTableData();
      });
  }
  ngAfterViewInit() {
    this.fetchPassTime();
  }
  ngOnDestroy() {
    this.fetchSub$?.unsubscribe();
  }

  getPosition(row: ExtremeOcc.Event) {
    if (row.locationType === '全线') {
      return row.locationType;
    }
    if (row.locationType === '自定义') {
      return row.customPosition;
    }
    if (row.locationType === '站点' || row.locationType === '车场') {
      return row.startStation;
    }
    if (row.locationType === '区间') {
      return `${row.startStation} - ${row.endStation}`;
    }
    return '';
  }
  getStartTime(row: ExtremeOcc.Event) {
    return row.startTime ? dayjs(row.startTime).format('MM/DD HH:mm') : '';
  }
  getEventRepairStateText(event: ExtremeOcc.Event) {
    return getEventRepairStateText(event);
  }
  getEventRepairStateColor(event: ExtremeOcc.Event) {
    return getEventRepairStateColor(event);
  }
  isPast(row: EventWithPast) {
    return !!row.past;
  }
  getEventType(row: ExtremeOcc.Event) {
    return row.eventType === '其他事件' ? row.otherEvent : row.eventType;
  }
  getPastText(row: EventWithPast) {
    return this.isPast(row) ? '过境后' : '过境前';
  }
  getPastColor(row: EventWithPast) {
    return this.isPast(row) ? '#00ffffe1' : 'inherit';
  }

  setFinalTableData() {
    const category = this.currentCategoryKey();
    const subType = this.currentSubTypeKey();
    const evs = this.composedEvents();
    if (category === 'all' && subType === 'all') {
      this.finalTableData = evs;
      return;
    }
    if (category === 'all') {
      this.finalTableData = evs.filter((e) => {
        return e.eventType === subType;
      });
      return;
    }
    // category !== 'all'
    if (subType === 'all') {
      const types = this.eventTypeKeyMap[category];
      this.finalTableData = evs.filter((e) => {
        return types.includes(e.eventType);
      });
      return;
    }
    // category !== 'all' && subType !== 'all'

    this.finalTableData = evs.filter((e) => {
      return e.eventType === subType;
    });
    return;
  }
}
