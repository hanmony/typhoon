import {
  Component,
  computed,
  HostBinding,
  input,
  output,
  signal,
  ViewChild,
} from '@angular/core';
import { interval, Subscription } from 'rxjs';
import { operationOnMapVisibilityFilter } from '../../occ/occ.const';
import { DASHBOARD_PRESET_CONFIG } from '../const.dashboard';
import { OpRecordDrawerComponent } from '../op-record-drawer/op-record-drawer.component';
import { EventTableComponent } from './event-table/event-table.component';
import { OperationTableComponent } from './operation-table/operation-table.component';
import { PanelHeaderComponent } from './panel-header/panel-header.component';

@Component({
  selector: 'dispatch-dashboard-panel',
  imports: [
    PanelHeaderComponent,
    EventTableComponent,
    OperationTableComponent,
    OpRecordDrawerComponent,
  ],
  templateUrl: './dashboard-panel.component.html',
  styleUrl: './dashboard-panel.component.less',
})
export class DashboardPanelComponent {
  @ViewChild(OpRecordDrawerComponent)
  opRecordDrawerRef?: OpRecordDrawerComponent;
  @ViewChild(EventTableComponent)
  eventTableRef?: EventTableComponent;
  @ViewChild(OperationTableComponent)
  operationTableRef?: OperationTableComponent;
  @HostBinding('attr.dashboard-panel') isDashboardPanel = true;
  events = input<ExtremeOcc.Event[]>([]);
  operations = input<ExtremeOcc.Operation[]>([]);
  allOperations = input<ExtremeOcc.Operation[]>([]);
  openPatrollingLine = output<string>();
  recordOperations = computed(() => {
    return this.allOperations().filter((o) => !!o.isShow);
  });

  excludedOperations = computed(() => {
    const allOperations = this.allOperations();
    return allOperations
      .filter(operationOnMapVisibilityFilter)
      .filter((o) => o.actionType !== '正线留车');
  });

  preset = signal<string | null>(null);
  type = signal<string>('event'); // ! must be event
  panelTitle = computed(() => {
    return this.type() === 'event' ? '线网事件态势看板' : '线网运营态势看板';
  });

  paginationConfig = signal({
    pageSize: 8,
    pageIndex: 1,
    autoTurn: false,
  });
  total = computed(() => {
    return this.eventsFilterByPreset().length;
  });

  eventsFilterByPreset = computed(() => {
    const preset = this.preset();
    const presetConfig = DASHBOARD_PRESET_CONFIG.find(
      (item) => item.name === preset,
    );
    if (!presetConfig) return this.events();
    const lines = presetConfig.lines;
    return this.events().filter((e) => lines.includes(e.line));
  });

  operationsFilterByPreset = computed(() => {
    const preset = this.preset();
    const presetConfig = DASHBOARD_PRESET_CONFIG.find(
      (item) => item.name === preset,
    );
    if (!presetConfig) return this.excludedOperations();
    const lines = presetConfig.lines;
    return this.excludedOperations().filter((o) => lines.includes(o.line));
  });

  onPresetChange(key: string) {
    this.eventTableRef?.resetInitialized();
    this.preset.set(key);
    this.paginationConfig.set({
      ...this.paginationConfig(),
      pageIndex: 1,
    });
  }
  handleAutoTurn() {
    const { autoTurn: prev } = this.paginationConfig();
    const autoTurnNow = !prev;
    this.paginationConfig.set({
      ...this.paginationConfig(),
      autoTurn: autoTurnNow,
    });
    if (autoTurnNow) {
      this.setupAutoTurn();
    } else {
      this.clearAutoTurn();
    }
  }
  onPageIndexChange(pageIndex: number) {
    this.paginationConfig.set({
      ...this.paginationConfig(),
      pageIndex,
    });
  }
  onPageIndexChangeManually(pageIndex: number) {
    this.paginationConfig.set({
      ...this.paginationConfig(),
      pageIndex,
    });
    this.resetAutoTurn();
  }
  onTypeChange(type: string) {
    this.type.set(type);
    this.paginationConfig.set({
      ...this.paginationConfig(),
      pageIndex: 1,
    });
    this.resetAutoTurn();
  }

  autoTurnInterval$ = interval(5000);
  autoTurnSubscription$?: Subscription;
  setupAutoTurn() {
    // this.autoTurnSubscription$ = this.autoTurnInterval$.subscribe(() => {
    //   const { pageIndex, pageSize } = this.paginationConfig();
    //   const next = pageIndex + 1;
    //   if (pageIndex * pageSize + 1 > this.total()) {
    //     this.onPageIndexChange(1);
    //     return;
    //   }
    //   this.onPageIndexChange(next);
    // });
    this.eventTableRef?.setAutoScrollEnabled(true);
    this.operationTableRef?.setAutoScrollEnabled(true);
  }
  clearAutoTurn() {
    this.autoTurnSubscription$?.unsubscribe();
    this.autoTurnSubscription$ = undefined;
    this.eventTableRef?.setAutoScrollEnabled(false);
    this.operationTableRef?.setAutoScrollEnabled(false);
  }
  resetAutoTurn() {
    if (!this.autoTurnSubscription$) return;
    this.clearAutoTurn();
    this.setupAutoTurn();
  }
  toggleRecordDrawer() {
    this.opRecordDrawerRef?.toggleVisible();
  }
}
