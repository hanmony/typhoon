import {
  Component,
  computed,
  input,
  output,
  signal,
  ViewChild,
} from '@angular/core';
import { NzMessageService } from 'ng-zorro-antd/message';
import { AnimationFrame } from '../../case-detail/services/classes/typhoon.class';
import { ITyphoonState, linesData2026 } from '../../case-detail/services/meta';
import { IllustrationModalComponent } from '../../dispatch-center/map/illustration-modal/illustration-modal.component';
import { OccMapEventEffectService } from '../../occ/map/event.effect.occ.service';
import { OccMapOperationEffectService } from '../../occ/map/operation.effect.occ.service';
import { OccModalWrapperComponent } from '../../occ/modal-wrapper/modal-wrapper.component';
import { operationOnMapVisibilityFilter } from '../../occ/occ.const';
import { OccEventType } from '../../occ/occ.event-bus.model';
import { OccEventBusService } from '../../occ/occ.event-bus.service';
import { CoccDockComponent, ToolItem } from './dock/dock.component';
import { CoccDutyModelComponent } from './duty-model/duty-model.component';
import { CoccEventListModalComponent } from './event-list-modal/event-list-modal.component';
import { CoccLeftPanelComponent } from './left-panel/left-panel.component';
import { LineSelectOverlayComponent } from './line-select-overlay/line-select-overlay.component';
import { CoccMapComponent } from './map/map.component';
import { CoccNotificationActionModelComponent } from './notification-action-model/notification-action-model.component';
import { NotificationListOverlayComponent } from './notification-list-overlay/notification-list-overlay.component';
import { environment } from '../../../../environments/environment';
import { CoccOperationListModalComponent } from './operation-list-modal/operation-list-modal.component';
import { OperationTablePanelComponent } from './operation-table-panel/operation-table-panel.component';
import { LeftScreenRightPanelComponent } from './right-panel/right-panel.component';
import { CoccSimulatePatrollingComponent } from './simulate-patrolling/simulate-patrolling.component';
@Component({
  selector: 'cocc-left-screen',
  imports: [
    CoccMapComponent,
    // DispatchTopActionComponent,
    // DraggableComponent,
    CoccDockComponent,
    LineSelectOverlayComponent,
    CoccLeftPanelComponent,
    LeftScreenRightPanelComponent,
    CoccEventListModalComponent,
    CoccOperationListModalComponent,
    CoccSimulatePatrollingComponent,
    OccModalWrapperComponent,
    CoccDutyModelComponent,
    CoccNotificationActionModelComponent,
    NotificationListOverlayComponent,
    IllustrationModalComponent,
    OperationTablePanelComponent,
  ],
  templateUrl: './left-screen.component.html',
  styleUrl: './left-screen.component.less',
})
export class CoccLeftScreenComponent {
  hideTitle = environment.hideTitle;
  @ViewChild(CoccDockComponent) dock!: CoccDockComponent;
  @ViewChild(CoccMapComponent) mapRef!: CoccMapComponent;
  @ViewChild(CoccEventListModalComponent)
  eventListModal!: CoccEventListModalComponent;
  @ViewChild(CoccOperationListModalComponent)
  operationListModal!: CoccOperationListModalComponent;
  @ViewChild(CoccSimulatePatrollingComponent)
  simulatePatrolling!: CoccSimulatePatrollingComponent;
  @ViewChild(CoccDutyModelComponent) dutyModel!: CoccDutyModelComponent;
  @ViewChild(CoccNotificationActionModelComponent)
  notificationActionModel!: CoccNotificationActionModelComponent;
  @ViewChild(NotificationListOverlayComponent)
  notificationList!: NotificationListOverlayComponent;
  @ViewChild(IllustrationModalComponent)
  illustrationModal?: IllustrationModalComponent;
  @ViewChild(OperationTablePanelComponent)
  operationTablePanel!: OperationTablePanelComponent;

  onLocationQuery = output<boolean>();
  showMessage = output<string>();
  removeMessage = output();
  openEmergencyResponseModal = output<void>();

  simulatePatrollingModalVisible = signal(false);
  dutyModalVisible = signal(false);
  notificationActionVisible = signal(false);
  notificationListVisible = signal(false);

  isHide = input<boolean>(false);

  eventListAdd = output<void>();
  operationListAdd = output<void>();

  allEvents = input<ExtremeOcc.Event[]>([]);
  allOperations = input<ExtremeOcc.Operation[]>([]);

  currentShownLines = signal<string[]>(linesData2026.map((l) => l.name));

  hideRepairEvent = signal(false);

  paginationConfig = {
    pageSize: 10,
    pageIndex: 0,
    autoTurn: false,
  };

  shouldShowEvents = computed(() =>
    this.allEvents().filter((e) => this.currentShownLines().includes(e.line)),
  );
  shouldShowOperations = computed(() =>
    this.allOperations().filter((o) =>
      this.currentShownLines().includes(o.line),
    ),
  );

  validOperations = computed(() => {
    return this.allOperations().filter(operationOnMapVisibilityFilter);
  });

  onEventListAdd() {
    this.eventListAdd.emit();
  }
  onOperationListAdd() {
    this.operationListAdd.emit();
  }

  fetchedEvent$ = this.occEventBusService.on(OccEventType.EVENTS_FETCHED);
  fetchedOperation$ = this.occEventBusService.on(
    OccEventType.OPERATIONS_FETCHED,
  );

  constructor(
    private occEventBusService: OccEventBusService,
    private eventService: OccMapEventEffectService,
    private operationService: OccMapOperationEffectService,
    private message: NzMessageService,
  ) {
    this.fetchedEvent$.subscribe((events) => {
      this.afterFetchEvents(events);
    });
    this.fetchedOperation$.subscribe((operations) => {
      this.afterFetchOperations(operations);
    });
  }

  onLineChange(lines: string[]) {
    this.currentShownLines.set(lines);
    this.mapRef.onLineChange(lines);
    setTimeout(() => {
      this.afterFetchEvents(this.allEvents());
      this.afterFetchOperations(this.allOperations());
    });
  }

  afterFetchEvents(evs: ExtremeOcc.Event[]) {
    const hideRepairEvent = this.hideRepairEvent();
    const filteredEvents = evs.filter((e) => {
      if (this.currentShownLines().includes(e.line)) {
        if (!hideRepairEvent) return true;
        return !e.urgentRepair;
      }
      return false;
    });
    this.eventService.diffEventsAndEffect(filteredEvents);
  }
  afterFetchOperations(ops: ExtremeOcc.Operation[]) {
    const filteredOperations = ops.filter((o) =>
      this.currentShownLines().includes(o.line),
    );
    this.operationService.diffOperationsAndEffect(filteredOperations);
  }

  updateTyphoonPosition(frame: AnimationFrame) {
    this.mapRef.typhoonModel.updateLayersWithFrame(frame);
  }
  updateTyphoonPath(previousStates: ITyphoonState[]) {
    this.mapRef.typhoonModel.updateLineLayer(
      previousStates.map((s) => s.center),
    );
  }
  updateTyphoonForecastPath(forecastStates: ITyphoonState[]) {
    this.mapRef.typhoonModel.updateForecastLineLayer(
      forecastStates.map((s) => s.center),
    );
  }
  locateEvent(ev: ExtremeOcc.Event) {
    this.mapRef.locateEvent(ev);
  }

  onEventListClick() {
    this.operationListModal?.close();
    this.eventListModal?.toggleVisible();
  }
  onOperationListClick() {
    this.eventListModal?.close();
    this.operationListModal?.toggleVisible();
  }
  setHideRepairEvent(visible: boolean) {
    this.hideRepairEvent.set(!visible);
    this.afterFetchEvents(this.allEvents());
  }
  setEffectVisibility(toolItem: ToolItem) {
    const visible = !toolItem.inactive;
    switch (toolItem.name) {
      case '抢修状态':
        this.setHideRepairEvent(visible);
        break;
      case '线路情况':
        this.operationService.setVisibility(visible);
        break;
      case '事件情况':
        this.eventService.setVisibility(visible);
        break;
      case '模拟巡道':
        this.togglePatrollingModel(visible);
        break;
      case '值班信息':
        this.toggleDutyModel(visible);
        break;
      case '通告汇报':
        this.setNotificationVisible(visible);
        break;
      case '图例说明':
        this.toggleIllustrationModal(visible);
        break;
      case '应急响应':
        this.openEmergencyResponseModel();
        break;
      default:
        break;
    }
  }
  toggleOperationTablePanel() {
    this.operationTablePanel.toggleVisible();
  }
  togglePatrollingModel(visible: boolean) {
    if (visible) {
      this.simulatePatrollingModalVisible.set(true);
    }
  }
  toggleDutyModel(visible: boolean) {
    if (visible) {
      this.dutyModalVisible.set(true);
    }
  }
  toggleNotificationActionModal(visible: boolean) {
    if (visible) {
      this.notificationActionVisible.set(true);
    }
  }
  openEmergencyResponseModel() {
    this.openEmergencyResponseModal.emit();
  }
  toggleIllustrationModal(visible: boolean) {
    this.illustrationModal?.setVisible(visible);
  }
  closeDutyModal() {
    this.dutyModalVisible.set(false);
    this.dock.toggleToolActivity('值班信息');
  }
  closeSimulatePatrollingModal() {
    this.simulatePatrollingModalVisible.set(false);
    this.dock.toggleToolActivity('模拟巡道');
  }
  async onDutyModalSubmit() {
    await this.dutyModel.onSubmit();
    this.message.success('提交成功');
    this.closeDutyModal();
  }
  async onNotificationActionModalSubmit() {
    await this.notificationActionModel.onSubmit();
    this.message.success('发送成功');
    this.closeNotificationActionModal();
    this.notificationList.fetchData();
  }
  closeNotificationActionModal() {
    this.notificationActionVisible.set(false);
    this.dock.toggleToolActivity('通告汇报');
  }
  openNotificationList() {
    this.notificationListVisible.set(true);
  }
  closeNotificationList() {
    this.notificationListVisible.set(false);
    this.dock.toggleToolActivity('通告汇报');
  }
  setNotificationVisible(visible: boolean) {
    this.notificationListVisible.set(visible);
  }

  onMapClick() {
    if (this.eventListModal?.visible()) {
      this.eventListModal.close();
      this.dock.toggleToolActivity('事件列表');
    }
    if (this.operationListModal?.visible()) {
      this.operationListModal.close();
      this.dock.toggleToolActivity('运营列表');
    }
    if (this.illustrationModal?.visible) {
      this.illustrationModal.close();
      this.dock.toggleToolActivity('图例说明');
    }
  }
}
