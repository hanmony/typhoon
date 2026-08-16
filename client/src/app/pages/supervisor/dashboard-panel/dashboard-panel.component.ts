import {
  Component,
  computed,
  HostBinding,
  input,
  signal,
  ViewChild,
} from '@angular/core';
import { interval, Subscription } from 'rxjs';
import { scaleInOut } from '../../../common.animation';
import { DASHBOARD_PRESET_CONFIG } from '../../dispatch-dashboard/const.dashboard';
import { operationOnMapVisibilityFilter } from '../../occ/occ.const';
import { SupervisorEventTableComponent } from './event-table/event-table.component';
import { SupervisorOpRecordDrawerComponent } from './op-record-drawer/op-record-drawer.component';
import { SupervisorOperationTableComponent } from './operation-table/operation-table.component';
import { SupervisorPanelHeaderComponent } from './panel-header/panel-header.component';

@Component({
  selector: 'supervisor-dashboard-panel',
  imports: [
    SupervisorPanelHeaderComponent,
    SupervisorEventTableComponent,
    SupervisorOperationTableComponent,
    SupervisorOpRecordDrawerComponent,
  ],
  templateUrl: './dashboard-panel.component.html',
  styleUrl: './dashboard-panel.component.less',
  animations: [scaleInOut],
})
export class DashboardPanelComponent {
  @ViewChild(SupervisorEventTableComponent)
  eventTableRef?: SupervisorEventTableComponent;
  @ViewChild(SupervisorOperationTableComponent)
  operationTableRef?: SupervisorOperationTableComponent;
  @ViewChild(SupervisorOpRecordDrawerComponent)
  opRecordDrawerRef?: SupervisorOpRecordDrawerComponent;
  @HostBinding('attr.dashboard-panel') isDashboardPanel = true;

  visible = signal(false);
  onClose() {
    this.visible.set(false);
  }

  events = input<ExtremeOcc.Event[]>([]);
  operations = input<ExtremeOcc.Operation[]>([]);

  recordOperations = computed(() => {
    return this.operations().filter((o) => !!o.isShow);
  });

  excludedOperations = computed(() => {
    const allOperations = this.operations();
    return allOperations
      .filter(operationOnMapVisibilityFilter)
      .filter((o) => o.actionType !== '正线留车');
  });

  preset = signal<string | null>(null);
  type = signal<string>('event'); // ! must be event
  panelTitle = computed(() => {
    return this.type() === 'event' ? '线网事件态势看板' : '线网运营态势看板';
  });

  total = computed(() => {
    return this.eventsFilterByPreset().length;
  });

  paginationConfig = signal({
    pageSize: 10,
    pageIndex: 1,
    autoTurn: false,
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
    this.preset.set(key);
    this.paginationConfig.set({
      ...this.paginationConfig(),
      pageIndex: 1,
    });
    this.eventTableRef?.resetInitialized();
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
    // this.autoTurnSubscription$?.unsubscribe();
    // this.autoTurnSubscription$ = undefined;
    this.eventTableRef?.setAutoScrollEnabled(false);
    this.operationTableRef?.setAutoScrollEnabled(false);
  }
  resetAutoTurn() {
    if (!this.autoTurnSubscription$) return;
    this.clearAutoTurn();
    this.setupAutoTurn();
  }

  toggleType() {
    this.type.update((v) => (v === 'event' ? 'operation' : 'event'));
  }
  toggleRecordDrawer() {
    this.opRecordDrawerRef?.toggleVisible();
  }

  setVisible(visible: boolean) {
    this.visible.set(visible);
  }
  toggleVisible() {
    this.visible.update((v) => !v);
  }
}
