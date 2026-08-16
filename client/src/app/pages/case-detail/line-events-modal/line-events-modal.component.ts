import {
  Component,
  ElementRef,
  EventEmitter,
  Output,
  ViewChild,
} from '@angular/core';
import { Subscription, fromEvent } from 'rxjs';
import { ActionDto } from '../../../domain/action.dto';
import { LibraryNzModule } from '../../../library.nz.module';
import {
  CategoryEventDto,
  LOCAL_EVENT_KEYS_MAP,
} from '../services/utils.service';
import { ActionCategory } from './../../../domain/action.category';
import { LineEventsModalTableCellComponent } from './cell/cell.component';

type TabKey = 'overview' | ActionCategory;

interface OverviewItemsWithValue {
  label: string;
  key: ActionCategory;
  typeText: string;
  value: number;
}

interface ColumnItem {
  key: string;
  name: string;
  align?: 'left' | 'right' | 'center';
  width?: number;
}

const overviewItems: Omit<OverviewItemsWithValue, 'value'>[] = [
  { label: '运营事件', key: ActionCategory.opevent },
  { label: '行车措施', key: ActionCategory.driving },
  { label: '客运措施', key: ActionCategory.transport },
  { label: '客运处置', key: ActionCategory.disposal },
  { label: '施工调整', key: ActionCategory.construction },
].map((item) => {
  const target = LOCAL_EVENT_KEYS_MAP.find(([_, key]) => key === item.key);
  return {
    ...item,
    typeText: target ? target[2] : 'unknown',
  };
});

const columns: ColumnItem[] = [
  { key: 'time', name: '时间', align: 'center' },
  { key: 'event', name: '事件', width: 100, align: 'center' },
  { key: 'location', name: '定位查看', align: 'center' },
];

@Component({
  selector: 'line-events-modal',
  imports: [LibraryNzModule, LineEventsModalTableCellComponent],
  templateUrl: './line-events-modal.component.html',
  styleUrl: './line-events-modal.component.less',
})
export class LineEventsModalComponent {
  visible = false;
  lineName: string = '';
  tabKey: TabKey = 'overview';
  columns = columns;
  $subscription?: Subscription;
  overviewItemsWithValue: OverviewItemsWithValue[] = [];
  data?: CategoryEventDto;

  @Output() locateEvent = new EventEmitter<{
    event: ActionDto;
    move: boolean;
  }>();

  @ViewChild('modal') modalRef?: ElementRef<HTMLDivElement>;

  open(line: string, data: CategoryEventDto) {
    this.tabKey = 'overview';
    this.data = data;
    this.lineName = line;
    this.overviewItemsWithValue = overviewItems.map((item) => {
      return {
        ...item,
        value: (data.get(item.key) || []).length,
      };
    });
    this.visible = true;
    // setTimeout(() => {
    //   this.addListener();
    // });
  }
  addListener() {
    this.$subscription = fromEvent(window, 'click', {
      capture: true,
    }).subscribe((ev) => {
      const modal = this.modalRef?.nativeElement;
      if (modal) {
        if (!modal.contains(ev.target as Node)) {
          this.visible = false;
          this.removeListener();
        }
      }
    });
  }
  removeListener() {
    if (this.$subscription) {
      this.$subscription.unsubscribe();
      this.$subscription = undefined;
    }
  }
  toDetail(key: TabKey) {
    this.tabKey = key;
  }
  backToOverview() {
    this.tabKey = 'overview';
  }
  close() {
    this.visible = false;
  }
  handleLocate(p: { event: ActionDto; move: boolean }) {
    this.locateEvent.emit(p);
  }
  get tableData() {
    if (this.tabKey === 'overview') return [];
    return this.data?.get(this.tabKey) || [];
  }
  get headerText() {
    if (this.tabKey === 'overview') {
      return '案例数据';
    }
    return (
      (overviewItems.find((item) => item.key === this.tabKey)?.label || '') +
      '详情'
    );
  }
}
