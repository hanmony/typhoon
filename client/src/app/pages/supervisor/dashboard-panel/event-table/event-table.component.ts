import {
  Component,
  computed,
  effect,
  ElementRef,
  input,
  output,
  signal,
  ViewChild,
} from '@angular/core';
import dayjs from 'dayjs';
import { debounce } from 'lodash-es';
import { fromEvent } from 'rxjs';
import { calculateDistanceToTarget } from '../../../../app.util';
import { LibraryNzModule } from '../../../../library.nz.module';
import { AutoScrollComponent } from '../../../../shared/auto.scroll';
import { getLineMark, lineNames } from '../../../case-detail/services/meta';
import {
  DetailPopupComponent,
  PopupConfig,
} from '../../../dispatch-dashboard/dashboard-panel/event-table/detail-popup/detail-popup.component';
import { StateTagComponent } from '../../../dispatch-dashboard/dashboard-panel/event-table/state-tag/state-tag.component';
import { getEventRepairStateText } from '../../../occ/occ.const';
import { OccEventType } from '../../../occ/occ.event-bus.model';
import { OccEventBusService } from '../../../occ/occ.event-bus.service';

interface EventWithIndex extends ExtremeOcc.Event {
  index: number;
}

@Component({
  selector: 'supervisor-event-table',
  imports: [LibraryNzModule, DetailPopupComponent, StateTagComponent],
  templateUrl: './event-table.component.html',
  styleUrl: './event-table.component.less',
})
export class SupervisorEventTableComponent extends AutoScrollComponent {
  @ViewChild('scrollContainer')
  override scrollContainer!: ElementRef;
  // override beyondPosition = 100;

  events = input<ExtremeOcc.Event[]>([]);
  paginationConfig = input.required<{
    pageSize: number;
    pageIndex: number;
    autoTurn: boolean;
  }>();
  orderConfig = signal({
    prop: 'index',
    asc: false,
  });
  onPageIndexChange = output<number>();

  excessWidth = signal({
    location: 184,
    detail: 367,
  });
  colWidth: number[] = [58, 80, 64, 68, 84, 116, 122];

  fullScreen$ = fromEvent(document, 'fullscreenchange');
  onorientationchange$ = fromEvent(window, 'orientationchange');

  override ngAfterViewInit() {
    this.setExcessWidth();
    this.fullScreen$.subscribe(() => {
      setTimeout(() => {
        this.setExcessWidth();
      }, 200);
    });
    this.onorientationchange$.subscribe(() => {
      setTimeout(() => {
        this.setExcessWidth();
      }, 200);
    });
    if (this.paginationConfig().autoTurn) {
      // 不自动滚动，手动点击‘自动翻页’功能按钮时，再开启自动滚动
      this.setAutoScrollEnabled(true);
    }
  }

  setExcessWidth() {
    const total =
      document.documentElement.offsetWidth -
      this.colWidth.reduce((a, b) => a + b, 0) -
      21; // 21 is margin
    this.excessWidth.set({
      location: total / 3,
      detail: (total / 3) * 2,
    });
    this.setFixHeight();
    this.setScrollHeight();
  }

  dataSet = computed<EventWithIndex[][]>(() => {
    const evs = this.events();
    // const { pageSize } = this.paginationConfig();
    const { prop, asc } = this.orderConfig();
    const supervisions = evs.filter((ev) => ev.supervision);
    const supervisionMovedForwardEvs = [
      ...supervisions,
      ...this.reorderByProp(
        prop,
        asc,
        evs.filter((ev) => !ev.supervision),
      ),
    ];
    const evsWithIndex = supervisionMovedForwardEvs.map((ev, index) => ({
      ...ev,
      index: index + 1,
    }));
    // const pages = Math.ceil(evsWithIndex.length / pageSize);
    // const dataSet: EventWithIndex[][] = [];
    // for (let i = 0; i < pages; i++) {
    //   dataSet.push(evsWithIndex.slice(i * pageSize, (i + 1) * pageSize));
    // }
    // return dataSet;
    return [evsWithIndex];
  });

  cacheDataSet: ExtremeOcc.Event[] = [];
  initialized = false;

  constructor(
    private elementRef: ElementRef<HTMLDivElement>,
    private occEventBusService: OccEventBusService,
  ) {
    super();
    effect(() => {
      // const index = this.paginationConfig().pageIndex - 1;
      // const pageWidth = document.documentElement.offsetWidth - 21;
      // this.contentRef?.nativeElement.scrollTo({
      //   left: pageWidth * index,
      //   behavior: 'smooth',
      // });
      this.dataSet();
      this.setFixHeight();
      this.setScrollHeight();
    });

    effect(() => {
      this.shiningRowsIfChange();
    });
  }
  touchStartCoord = {
    x: 0,
    y: 0,
  };
  // onTouchStart(event: TouchEvent) {
  //   this.touchStartCoord = {
  //     x: event.touches[0].clientX,
  //     y: event.touches[0].clientY,
  //   };
  // }
  touchMoveHandler = async (event: TouchEvent) => {
    const direction =
      event.touches[0].clientX > this.touchStartCoord.x ? 'left' : 'right';
    const currentPageIndex = this.paginationConfig().pageIndex;
    const size = this.dataSet().length;
    if (direction === 'left') {
      this.onPageIndexChange.emit(
        currentPageIndex > 2 ? currentPageIndex - 1 : 1,
      );
    } else {
      this.onPageIndexChange.emit(
        currentPageIndex < size ? currentPageIndex + 1 : size,
      );
    }
  };
  debounceTouchMoveHandler = debounce(this.touchMoveHandler, 50, {
    trailing: true,
  });

  resetInitialized() {
    this.initialized = false;
  }

  // onTouchMove(event: TouchEvent) {
  //   this.debounceTouchMoveHandler(event);
  // }

  shiningRowsIfChange() {
    const cur = this.events();
    if (!this.initialized && !cur.length) return;
    if (!this.initialized) {
      this.setCacheDataSet(cur);
      this.initialized = true;
      return;
    }
    const changedIds: string[] = [];
    cur.forEach((ev) => {
      if (this.shouldShining(ev)) {
        changedIds.push(ev.id);
      }
    });
    if (changedIds.length) {
      this.shiningRowsWithDomAction(changedIds);
    }
    this.setCacheDataSet(cur);
  }

  setCacheDataSet(data: ExtremeOcc.Event[]) {
    this.cacheDataSet = data.slice();
  }

  isCacheExist(id: string) {
    return !!this.cacheDataSet.find((ev) => ev.id === id);
  }
  shouldShining(row: ExtremeOcc.Event) {
    const prevEv = this.cacheDataSet.find((ev) => ev.id === row.id);
    if (!prevEv) return true;
    const keys: (keyof ExtremeOcc.Event)[] = [
      'actionType',
      'urgentRepair',
      'urgentRepairStatus',
      'repairUnits',
      'responsiblePerson',
      'contactPhone',
      'supervision',
      'associatedPoint',
    ] as (keyof ExtremeOcc.Event)[];
    for (const key of keys) {
      const prevValue = prevEv[key];
      const curValue = row[key];
      if (Array.isArray(curValue)) {
        if (prevValue.toString() !== curValue.toString()) {
          return true;
        }
      } else {
        if (prevValue !== curValue) {
          return true;
        }
      }
    }
    return false;
  }

  getTargetRows(ids: string[]) {
    const dom = this.elementRef.nativeElement;
    if (!dom) return [];
    const curTableRowsDom = dom.querySelectorAll('.ev-row');
    if (!curTableRowsDom?.length) return [];
    const result: Element[] = [];
    Array.from(curTableRowsDom).forEach((row) => {
      const id = row.getAttribute('ev-row-id');
      if (!id) return;
      if (ids.includes(id)) {
        result.push(row);
      }
    });
    return result;
  }

  getTargetRow(id: string): Element | null {
    const dom = this.elementRef.nativeElement;
    if (!dom) return null;
    const curTableRowsDom = dom.querySelectorAll('.ev-row');
    if (!curTableRowsDom?.length) return null;
    let resultRow: Element | null = null;
    Array.from(curTableRowsDom).forEach((row) => {
      const rowId = row.getAttribute('ev-row-id');
      if (rowId === id) {
        resultRow = row;
        return;
      }
    });
    return resultRow;
  }

  shiningRowsWithDomAction(ids: string[]) {
    setTimeout(() => {
      this.getTargetRows(ids).forEach((row) => {
        row.classList.add('shining-animation');
      });
    }, 100);

    setTimeout(
      () => {
        this.removeShiningEffectAfter4s(ids);
      },
      3 * 30 * 1000,
    ); // 3分钟
  }

  removeShiningEffectAfter4s(ids: string[]) {
    this.getTargetRows(ids).forEach((row) => {
      row.classList.remove('shining-animation');
    });
  }

  getEventType(event: ExtremeOcc.Event) {
    return event.eventType === '其他事件' ? event.otherEvent : event.eventType;
  }
  getLineMark(line: string) {
    return getLineMark(line);
  }
  getEventRepairStateText(event: ExtremeOcc.Event) {
    let repairStateText = '';
    if (event.urgentRepair) {
      repairStateText =
        {
          0: '未处置',
          1: '处置中',
          2: '处置完成',
        }[event.urgentRepairStatus] || '未处置';
    } else {
      repairStateText = '无需抢修';
    }
    return repairStateText;
  }
  getEventRepairStateColor(event: ExtremeOcc.Event) {
    if (event.terminated) {
      return '#ffffff91';
    }
    const stateText = this.getEventRepairStateText(event);
    return (
      {
        无需抢修: '#ffffff80',
        未处置: '#f87171ee',
        处置中: '#30aaffee',
        处置完成: '#2DB391ff',
      }[stateText] || '#ffffff91'
    );
  }

  onRowClick(id: string) {
    const row = this.getTargetRow(id);
    if (!row) return;
    row.classList.remove('shining-animation');
  }

  getStartTime(row: ExtremeOcc.Event) {
    return row.startTime ? dayjs(row.startTime).format('HH:mm') : '';
  }

  showRepairInfoIcon(ev: ExtremeOcc.Event) {
    if (ev.repairUnits?.length > 0) return true;
    if (ev.responsiblePerson) return true;
    if (ev.contactPhone) return true;
    return false;
  }

  readImages(ev: ExtremeOcc.Event) {
    this.occEventBusService.dispatch({
      type: OccEventType.READ_IMAGES,
      payload: {
        images: ev.images,
      },
    });
  }

  popupConfig = signal<PopupConfig>({
    visible: false,
    scale: 0.1,
    data: null as ExtremeOcc.Event | null,
    type: 'supervision',
    x: 0,
    y: 0,
  });

  onAction(
    $event: MouseEvent,
    action: 'urgentRepair' | 'supervision',
    ev: ExtremeOcc.Event,
  ) {
    $event.stopPropagation();

    if (this.popupConfig().visible) {
      this.popupConfig.update((prev) => ({
        ...prev,
        visible: false,
      }));
    }

    const { left, top } = calculateDistanceToTarget(
      $event.target as HTMLImageElement,
      'dashboard-panel',
    );
    const index = this.paginationConfig().pageIndex - 1;
    const offsetX = index * (document.documentElement.offsetWidth - 21);
    const scale = 0.75;
    const x = left - offsetX - 440 - 10;
    let y = top - 32;

    if (y + 320 * scale + 10 > 777) {
      // 超出底部
      y = 777 - 320 * scale - 44;
    }
    this.popupConfig.set({
      visible: true,
      type: action,
      data: ev,
      scale,
      x,
      y,
    });
  }
  closeDetailPopup() {
    this.popupConfig.update((prev) => ({
      ...prev,
      visible: false,
    }));
  }

  reorderByProp(prop: string, asc: boolean, evs: ExtremeOcc.Event[]) {
    switch (prop) {
      case 'index':
        return evs;
      case 'line':
        return evs.sort((a, b) => {
          const aIndex = lineNames.indexOf(a.line);
          const bIndex = lineNames.indexOf(b.line);
          if (asc) {
            return aIndex - bIndex;
          } else {
            return bIndex - aIndex;
          }
        });
      case 'startTime':
        return evs.sort((a, b) => {
          if (asc) {
            return (
              new Date(a.startTime).getTime() - new Date(b.startTime).getTime()
            );
          } else {
            return (
              new Date(b.startTime).getTime() - new Date(a.startTime).getTime()
            );
          }
        });
      case 'eventType':
        return evs.sort((a, b) => {
          if (asc) {
            return a.eventType.localeCompare(b.eventType);
          } else {
            return b.eventType.localeCompare(a.eventType);
          }
        });
      case 'state':
        return evs.sort((a, b) => {
          if (asc) {
            return getEventRepairStateText(a).localeCompare(
              getEventRepairStateText(b),
            );
          } else {
            return getEventRepairStateText(b).localeCompare(
              getEventRepairStateText(a),
            );
          }
        });
      default:
        return evs;
    }
  }

  handleOrdering(prop: string) {
    const { asc, prop: prevProp } = this.orderConfig();
    if (prevProp === prop) {
      if (asc === false) {
        this.cancelOrdering();
        return;
      }
      this.orderConfig.set({
        prop,
        asc: !asc,
      });
      this.onPageIndexChange.emit(1);
      return;
    }
    this.orderConfig.set({
      prop,
      asc: true,
    });
    this.onPageIndexChange.emit(1);
  }

  cancelOrdering() {
    this.orderConfig.set({
      prop: 'index',
      asc: false,
    });
    this.onPageIndexChange.emit(1);
  }
}
