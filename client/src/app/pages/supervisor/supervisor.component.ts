import { Component, computed, signal, viewChild, ViewChild } from '@angular/core';
import { Router } from '@angular/router';
import { NzMessageService } from 'ng-zorro-antd/message';
import { interval, Subscription } from 'rxjs';
import { LibraryNzModule } from '../../library.nz.module';
import { ApiService } from '../../services/api.service';
import { SettingService } from '../../services/setting.service';
import { EmergencyResponseAlertsComponent } from '../../shared/emergency-response-alerts/emergency-response-alerts.component';
import { TyphoonNameComponent } from '../../common.component/typhoon-name/typhoon-name.component';
import { linesData2026 } from '../case-detail/services/meta';
import { CommandService } from '../occ/map/command.service';
import { OccTyphoonService } from '../occ/map/typhoon.occ.service';
import {
  eventOnMapVisibilityFilter,
  occEventCategories,
  operationOnMapVisibilityFilter,
} from '../occ/occ.const';
import { OccEventType } from '../occ/occ.event-bus.model';
import { OccEventBusService } from '../occ/occ.event-bus.service';
import { ActionOverlayComponent } from './action-overlay/action-overlay.component';
import { DashboardPanelComponent } from './dashboard-panel/dashboard-panel.component';
import { EventStatisticComponent } from './event-statistic/event-statistic.component';
import { FocusEventOverlayComponent } from './focus-event-overlay/focus-event-overlay.component';
import { SupervisorIllustrationModalComponent } from './illustration-modal/illustration-modal.component';
import { LineSelectionOverlayComponent } from './line-selection-overlay/line-selection-overlay.component';
import { LineStatisticOverlayComponent } from './line-statistic-overlay/line-statistic-overlay.component';
import { NotificationDomComponent } from './notification-dom/notification-dom.component';
import { NotificationListOverlayComponent } from './notification-list-overlay/notification-list-overlay.component';
import { SupervisorNotificationService } from './notification.supervisor.service';
import { PatrollingOverlayComponent } from './patrolling-overlay/patrolling-overlay.component';
import {
  SupervisorDockComponent,
  ToolItem,
} from './supervisor-dock/supervisor-dock.component';
import { SupervisorFilterActionComponent } from './supervisor-filter-action/supervisor-filter-action.component';
import { SupervisorHeaderComponent } from './supervisor-header/supervisor-header.component';
import { SupervisorMapComponent } from './supervisor-map/supervisor-map.component';
import { SupervisorPanelComponent } from './supervisor-panel/supervisor-panel.component';
import { SupervisorWeatherMarkerComponent } from './supervisor-weather-marker/supervisor-weather-marker.component';
import { WeatherRecordOverlayComponent } from './weather-record-overlay/weather-record-overlay.component';

type VisibleState = {
  actionOverlay: boolean;
  patrollingOverlay: boolean;
  eventStatisticOverlay: boolean;
  lineSelectionOverlay: boolean;
  // lineHaltOverlay: boolean;
  focusEventOverlay: boolean;
  lineStatisticOverlay: boolean;
  notificationListOverlay: boolean;
  illustrationModal: boolean;
  weatherRecordOverlay: boolean;
  dashboardPanel: boolean;
};

/**
 * 右侧 supervisor-panel 展开时的宽度（与 supervisor-panel.component.less 中 .panel 的 width: 23rem 对应）。
 * 用于计算指挥名称在「可视区减去 panel」后的水平居中位置。
 */
const SUPERVISOR_PANEL_WIDTH_PX = 23 * 16;

@Component({
  selector: 'supervisor-page',
  imports: [
    LibraryNzModule,
    SupervisorHeaderComponent,
    SupervisorFilterActionComponent,
    SupervisorPanelComponent,
    SupervisorWeatherMarkerComponent,
    SupervisorMapComponent,
    SupervisorDockComponent,
    ActionOverlayComponent,
    PatrollingOverlayComponent,
    LineSelectionOverlayComponent,
    FocusEventOverlayComponent,
    LineStatisticOverlayComponent,
    NotificationListOverlayComponent,
    NotificationDomComponent,
    EventStatisticComponent,
    SupervisorIllustrationModalComponent,
    // LineHaltOverlayComponent,
    WeatherRecordOverlayComponent,
    DashboardPanelComponent,
    EmergencyResponseAlertsComponent,
    TyphoonNameComponent,
  ],
  templateUrl: './supervisor.component.html',
  styleUrl: './supervisor.component.less',
})
export class SupervisorComponent {
  @ViewChild(SupervisorMapComponent) mapRef?: SupervisorMapComponent;
  @ViewChild(ActionOverlayComponent) actionOverlayRef?: ActionOverlayComponent;
  @ViewChild(NotificationListOverlayComponent)
  notificationListOverlayRef?: NotificationListOverlayComponent;
  @ViewChild(NotificationDomComponent)
  notificationDomRef!: NotificationDomComponent;
  @ViewChild(SupervisorDockComponent) dockRef?: SupervisorDockComponent;
  @ViewChild(SupervisorIllustrationModalComponent)
  illustrationModalRef?: SupervisorIllustrationModalComponent;
  @ViewChild(LineStatisticOverlayComponent)
  lineStatisticOverlayRef?: LineStatisticOverlayComponent;
  @ViewChild(WeatherRecordOverlayComponent)
  weatherRecordOverlayRef?: WeatherRecordOverlayComponent;
  @ViewChild(DashboardPanelComponent)
  dashboardPanelRef!: DashboardPanelComponent;

  valid = signal(false);

  /** 右侧 supervisor-panel 引用，用于读取其 collapse 状态 */
  panelRef = viewChild(SupervisorPanelComponent);

  /**
   * 指挥名称显示文本。
   * 来源：typhoonCommand/info 的 name 字段（台风名或无台风时的自定义指挥名称）。
   * 与 cocc/dispatch-center 保持一致：有台风时拼成"编号+台风名+强度"，无台风时只显示名称。
   */
  commandNameText = signal('');

  /**
   * 名称的水平居中位置：在「页面可视区减去右侧 panel 占用宽度」后的中点。
   * panel 展开宽度 23rem，收起后为 0。
   */
  commandNameLeft = computed(() => {
    const panelCollapsed = this.panelRef()?.collapse() ?? false;
    const panelWidthPx = panelCollapsed ? 0 : SUPERVISOR_PANEL_WIDTH_PX;
    return `calc(50% - ${panelWidthPx / 2}px)`;
  });

  visibleState = signal<VisibleState>({
    actionOverlay: true,
    patrollingOverlay: false,
    eventStatisticOverlay: false,
    lineSelectionOverlay: false,
    // lineHaltOverlay: false,
    focusEventOverlay: false,
    lineStatisticOverlay: false,
    notificationListOverlay: false,
    illustrationModal: false,
    weatherRecordOverlay: false,
    dashboardPanel: false,
  });

  lineStatisticOverlayMetaName = signal('1号线');

  cacheLines = signal<string[]>(linesData2026.map((l) => l.name));

  private updateVisibleState(key: keyof VisibleState, value: boolean) {
    this.visibleState.update((state) => ({
      ...state,
      [key]: value,
    }));
  }

  private setAllVisibleFalse() {
    this.visibleState.update((state) => ({
      ...state,
      actionOverlay: false,
      patrollingOverlay: false,
      eventStatisticOverlay: false,
      lineSelectionOverlay: false,
      // lineHaltOverlay: false,
      focusEventOverlay: false,
      lineStatisticOverlay: false,
      notificationListOverlay: false,
      illustrationModal: false,
      weatherRecordOverlay: false,
      dashboardPanel: false,
    }));
  }
  filteredRepairState = signal<string | number>('all');
  filterCategoryValue = signal<string | number>('all');
  filterOperationType = signal<string | number>('all');

  events = signal<ExtremeOcc.Event[]>([]);
  operations = signal<ExtremeOcc.Operation[]>([]);

  filteredEvents = computed(() => {
    return this.events().filter(eventOnMapVisibilityFilter);
  });

  filteredOperations = computed(() => {
    return this.operations().filter(operationOnMapVisibilityFilter);
  });

  shouldShownEvents = computed(() => {
    const repairState = this.filteredRepairState();
    const category = this.filterCategoryValue();
    const lineFilter = (e: ExtremeOcc.Event) =>
      this.cacheLines().includes(e.line);
    const repairStateFilter = (e: ExtremeOcc.Event) => {
      if (repairState === 'all') return true;
      if (!e.urgentRepair) return false;
      if (e.urgentRepairStatus === Number(repairState)) {
        return true;
      }
      return false;
    };
    const categoryFilter = (e: ExtremeOcc.Event) => {
      if (category === 'all') return true;
      const types = occEventCategories.find(
        (c) => c.label === category,
      )!.contains;
      return types.includes(e.eventType);
    };

    return this.filteredEvents()
      .filter(lineFilter)
      .filter(repairStateFilter)
      .filter(categoryFilter);
  });
  shouldShownOperations = computed(() => {
    const operationType = this.filterOperationType();
    const lineFilter = (o: ExtremeOcc.Operation) =>
      this.cacheLines().includes(o.line);
    const operationTypeFilter = (o: ExtremeOcc.Operation) => {
      if (operationType === 'all') return true;
      if (o.actionType === operationType) {
        return true;
      }
      return false;
    };
    return this.filteredOperations()
      .filter(lineFilter)
      .filter(operationTypeFilter);
  });

  intervalUpdateTyphoon$ = interval(60000);
  intervalUpdateData$ = interval(5000);
  intervalUpdateDataSubscription?: Subscription;
  intervalUpdateTyphoonSubscription?: Subscription;

  lineMarkerClick$ = this.occEventBusService.on(OccEventType.LINE_MARKER_CLICK);

  constructor(
    private api: ApiService,
    private setting: SettingService,
    private occTyphoonService: OccTyphoonService,
    private occEventBusService: OccEventBusService,
    private commandService: CommandService,
    private notificationService: SupervisorNotificationService,
    private message: NzMessageService,
    private router: Router,
  ) {
    this.lineMarkerClick$.subscribe((lineName) => {
      this.openLineStatisticOverlay(lineName);
    });
  }

  ngOnInit() {
    this.validateCommandPlatform();
    this.validateDispatchCenterAuth();
  }

  async validateDispatchCenterAuth() {
    await this.setting.init();
    if (!this.setting.isSupervisor && !this.setting.isAdmin) {
      this.message.error('您没有权限访问此页面');
      this.router.navigate(['/portal']);
    }
  }

  async validateCommandPlatform(notExistMessage?: string) {
    try {
      const command = await this.commandService.validateCommandPlatform();
      if (!command) {
        this.valid.set(false);
        if (notExistMessage) {
          this.message.info(notExistMessage);
        }
      } else {
        this.occTyphoonService.setup();
        this.init();
        this.valid.set(true);
        this.setCommandName();
      }
    } catch (error) {
      this.valid.set(false);
      this.message.info('指挥台检测失败');
    }
  }

  /**
   * 指挥台校验成功后立即设置显示名称。
   * 无台风（自定义指挥名称）时也能显示，不依赖能否匹配到真实台风。
   */
  setCommandName() {
    const commandName = this.occTyphoonService.commandName;
    if (!commandName) return;
    const { name, unitKey } = this.occTyphoonService;
    // 未匹配到台风：只显示指挥名称；匹配到台风：保持与 cocc/dispatch 一致（编号+台风名）
    this.commandNameText.set(name ? `${unitKey}${name}` : commandName);
  }

  init() {
    this.fetchEventList();
    this.fetchOperationList();

    this.intervalUpdateDataSubscription = this.intervalUpdateData$.subscribe(
      () => {
        this.fetchEventList();
        this.fetchOperationList();
      },
    );

    setTimeout(() => {
      this.updateTyphoonPosition();
    }, 100);
    this.intervalUpdateTyphoonSubscription =
      this.intervalUpdateTyphoon$.subscribe(() => {
        this.updateTyphoonPosition();
      });
  }

  async fetchEventList() {
    const events = await this.api.extreme.getOccEvents();
    this.events.set(events);
    this.dispatchFilteredEvents();
  }

  async fetchOperationList() {
    const operations = await this.api.extreme.getOccOperationList();
    this.operations.set(operations);
    this.dispatchFilteredOperations();
  }
  dispatchFilteredOperations() {
    this.occEventBusService.dispatch({
      type: OccEventType.OPERATIONS_FETCHED,
      payload: this.shouldShownOperations(),
    });
  }
  dispatchFilteredEvents() {
    this.occEventBusService.dispatch({
      type: OccEventType.EVENTS_FETCHED,
      payload: this.shouldShownEvents(),
    });
  }
  async updateTyphoonPosition() {
    await this.occTyphoonService.fetchTyphoonData();
    const current = this.occTyphoonService.getCurrentTyphoonFrame();
    if (current?.frame) {
      this.occEventBusService.dispatch({
        type: OccEventType.UPDATE_TYPHOON_POSITION,
        payload: current,
      });
    }
  }
  locateEvent(ev: ExtremeOcc.Event) {
    this.mapRef?.locateEvent(ev);
  }
  onLineChange(lines: string[]) {
    this.cacheLines.set(lines);
    this.mapRef?.onLineChange(lines);
  }

  setEffectVisibility(toolItem: ToolItem) {
    if (toolItem.name === '图例说明') {
      this.toggleIllustrationModal(!toolItem.inactive);
      return;
    }
    if (toolItem.name === '气象记录') {
      this.toggleWeatherRecordOverlay(!toolItem.inactive);
      return;
    }
    this.mapRef?.setEffectVisibility(toolItem);
  }

  onOperationTypeFilterValueChange(value: string | number) {
    this.filterOperationType.set(value);
    this.dispatchFilteredOperations();
  }
  onEventDelayFilterValueChange(value: string | number) {
    this.filterCategoryValue.set(value);
    this.dispatchFilteredEvents();
  }
  onEvenRepairStateFilterValueChange(state: string | number) {
    this.filteredRepairState.set(state);
    this.dispatchFilteredEvents();
  }

  ngAfterViewInit() {
    this.notificationService.link(this.notificationDomRef);
    this.setDocumentElementStyles();
  }
  ngOnDestroy() {
    this.intervalUpdateDataSubscription?.unsubscribe();
    this.intervalUpdateTyphoonSubscription?.unsubscribe();
  }

  onAction(key: string) {
    switch (key) {
      case 'simulate-patrolling':
        this.togglePatrollingOverlay();
        break;
      case 'event-statistic':
        this.toggleEventStatisticOverlay();
        break;
      // case 'stop-operation':
      //   this.openLineHaltOverlay();
      //   break;
      case 'dashboard-panel':
        this.toggleDashboardPanel(true);
        break;
      case 'line-filter':
        this.openLineSelectionOverlay();
        break;
      case 'focus-event':
        this.openFocusEventOverlay();
        break;
      default:
        break;
    }
  }
  revertActionOverlay() {
    this.setAllVisibleFalse();
    this.updateVisibleState('actionOverlay', true);
    this.lineStatisticOverlayRef?.close();
  }
  onMapClick() {
    this.revertActionOverlay();
    if (this.actionOverlayRef?.isIntelligentTool()) {
      this.actionOverlayRef?.toggleIntelligentTool();
    }
    if (this.visibleState().illustrationModal) {
      this.toggleIllustrationModal(false);
      this.dockRef?.setToolInactive('图例说明', true);
    }

    if (this.visibleState().weatherRecordOverlay) {
      this.toggleWeatherRecordOverlay(false);
      this.dockRef?.setToolInactive('气象记录', true);
    }
  }
  closePatrollingOverlay() {
    this.updateVisibleState('patrollingOverlay', false);
  }
  togglePatrollingOverlay() {
    this.updateVisibleState(
      'patrollingOverlay',
      !this.visibleState().patrollingOverlay,
    );
  }
  toggleEventStatisticOverlay() {
    this.updateVisibleState(
      'eventStatisticOverlay',
      !this.visibleState().eventStatisticOverlay,
    );
    this.actionOverlayRef?.toggleEventStatisticTool();
  }
  toggleIllustrationModal(visible: boolean) {
    this.updateVisibleState('illustrationModal', visible);
    this.illustrationModalRef?.setVisible(visible);
  }
  toggleWeatherRecordOverlay(visible: boolean) {
    this.updateVisibleState('weatherRecordOverlay', visible);
    this.weatherRecordOverlayRef?.setVisible(visible);
  }
  toggleDashboardPanel(visible: boolean) {
    this.updateVisibleState('dashboardPanel', visible);
    this.dashboardPanelRef?.setVisible(visible);
  }
  closeNotificationListOverlay() {
    this.updateVisibleState('notificationListOverlay', false);
  }
  toggleNotificationListOverlay() {
    this.updateVisibleState(
      'notificationListOverlay',
      !this.visibleState().notificationListOverlay,
    );
  }
  openLineSelectionOverlay() {
    this.setAllVisibleFalse();
    this.updateVisibleState('lineSelectionOverlay', true);
  }
  // openLineHaltOverlay() {
  //   this.setAllVisibleFalse();
  //   this.updateVisibleState('lineHaltOverlay', true);
  // }
  openFocusEventOverlay() {
    this.setAllVisibleFalse();
    this.updateVisibleState('focusEventOverlay', true);
  }
  openLineStatisticOverlay(lineName: string) {
    this.setAllVisibleFalse();
    this.lineStatisticOverlayRef?.open();
    this.lineStatisticOverlayMetaName.set(lineName);
  }
  openNotificationListOverlay() {
    this.updateVisibleState('notificationListOverlay', true);
    this.notificationDomRef.clear();
  }

  setDocumentElementStyles() {
    // const scale = window.devicePixelRatio;
    document.documentElement.style.setProperty('margin', '0 auto');
    document.documentElement.style.setProperty('position', 'relative');
    document.documentElement.style.setProperty('overflow-x', 'hidden');
    document.documentElement.style.setProperty('overflow-y', 'hidden');

    document.documentElement.style.setProperty('font-size', `14px`);
    document.body.style.setProperty('font-size', `14px`);
    const fontText = `-apple-system,
        Microsoft YaHe,
        "微软雅黑",
        "黑体",
        HeiTi`;
    document.documentElement.style.setProperty('font-family', fontText);
    document.body.style.setProperty('font-family', fontText);
  }
  isFullScreen() {
    return window.innerHeight === screen.height;
  }
  fullScreen() {
    if (document.fullscreenElement) {
      document.exitFullscreen();
    } else {
      document.documentElement.requestFullscreen();
      // @ts-expect-error
      screen.orientation.lock('landscape-primary');
    }
  }
}
