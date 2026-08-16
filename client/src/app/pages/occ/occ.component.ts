import { Component, computed, signal, ViewChild } from '@angular/core';
import { NzImageService } from 'ng-zorro-antd/image';
import { NzMessageService } from 'ng-zorro-antd/message';
import {
  depots,
  ILinePoint,
  ITyphoonState,
  linesData2026,
} from '../case-detail/services/meta';
import { LibraryNzModule } from './../../library.nz.module';
import { ApiService } from './../../services/api.service';
import { SettingService } from './../../services/setting.service';
import { StorageService } from './../../services/storage.service';
import { OccDockComponent } from './dock/dock.component';
import { OccEventListModalComponent } from './event-list-modal/event-list-modal.component';
import { OccEventModalComponent } from './event-modal/event-modal.component';
import { OccMapLocateService } from './map/locate.occ.service';
import { OccMapComponent } from './map/map.component';
import { OccTyphoonService } from './map/typhoon.occ.service';
import { OccMessageTipComponent } from './message-tip/message-tip.component';
import { OccModalWrapperComponent } from './modal-wrapper/modal-wrapper.component';
import { OccNotificationOverlayComponent } from './notification-overlay/notification-overlay.component';
import {
  actions,
  getActionByKey,
  getOperationSubActionByKey,
  isOperationSubAction,
  operationSubActions,
} from './occ.const';
import { OccEventType } from './occ.event-bus.model';
import { OccEventBusService } from './occ.event-bus.service';
import { OccOperationListModalComponent } from './operation-list-modal/operation-list-modal.component';
import { OccOperationModalComponent } from './operation-modal/operation-modal.component';
import { OccActionOverlayComponent } from './right-panel/action-overlay/action-overlay.component';
import { OccRightPanelComponent } from './right-panel/right-panel.component';

import { Router } from '@angular/router';
import 'proj4leaflet';
import { interval, Observable, Subscription } from 'rxjs';
import { TyphoonNameComponent } from '../../common.component/typhoon-name/typhoon-name.component';
import { environment } from '../../../environments/environment';
import { CommandService } from './map/command.service';
import { OccSimulatePatrollingComponent } from './simulate-patrolling/simulate-patrolling.component';

@Component({
  selector: 'app-occ',
  imports: [
    LibraryNzModule,
    OccMapComponent,
    OccNotificationOverlayComponent,
    OccRightPanelComponent,
    OccActionOverlayComponent,
    OccEventModalComponent,
    OccOperationModalComponent,
    OccMessageTipComponent,
    OccModalWrapperComponent,
    OccDockComponent,
    OccEventListModalComponent,
    OccOperationListModalComponent,
    OccSimulatePatrollingComponent,
    TyphoonNameComponent,
  ],
  templateUrl: './occ.component.html',
  styleUrl: './occ.component.less',
})
export class OccComponent {
  hideTitle = environment.hideTitle;
  @ViewChild(OccMapComponent) mapComponent?: OccMapComponent;
  @ViewChild(OccActionOverlayComponent)
  actionOverlay?: OccActionOverlayComponent;
  @ViewChild(OccMessageTipComponent) messageTip?: OccMessageTipComponent;
  @ViewChild(OccEventModalComponent) eventModal?: OccEventModalComponent;
  @ViewChild(OccOperationModalComponent)
  operationModal?: OccOperationModalComponent;
  @ViewChild(OccEventListModalComponent)
  eventListModal?: OccEventListModalComponent;
  @ViewChild(OccOperationListModalComponent)
  operationListModal?: OccOperationListModalComponent;
  @ViewChild(OccSimulatePatrollingComponent)
  simulatePatrollingComponent?: OccSimulatePatrollingComponent;
  valid = signal(false);

  events = signal<ExtremeOcc.Event[]>([]);
  operations = signal<ExtremeOcc.Operation[]>([]);
  eventStatistics = signal<ExtremeOcc.EventInfo | undefined>(undefined);

  dockConfig = signal({
    x: 28,
    y: document.documentElement.clientHeight - 48 - 45,
  });

  currentLine = signal(this.storage.getString('occAdminLine') || '机场联络线');
  currentLineText = computed(() => {
    const line = this.currentLine();
    return line === '机场联络线' ? '机场线' : line;
  });
  lineSelectVisible = computed(() => this.setting.isAdmin);

  stations = computed(() => {
    return (
      linesData2026
        .find((l) => l.name === this.currentLine())
        ?.points.filter((p) => p.type === 'station') || []
    );
  });
  depots = computed(() => {
    return depots.filter((d) => d.line === this.currentLine());
  });

  lines = linesData2026.map((l) => l.name);

  locateStations: ILinePoint[] = [];

  hideToSelect = signal(false);

  simulatePatrollingModalConfig = signal({
    visible: false,
    data: {
      line: this.currentLine(),
    },
  });
  isOnPatrollingAction = computed(() => {
    return this.simulatePatrollingModalConfig().visible;
  });

  modalConfig = signal<{
    action: 'add' | 'edit';
    visible: boolean;
    data: Partial<ExtremeOcc.Event> | Partial<ExtremeOcc.Operation> | null;
    eventModalVisible: boolean;
    operationModalVisible: boolean;
  }>({
    action: 'add',
    visible: false,
    data: null,
    eventModalVisible: false,
    operationModalVisible: false,
  });
  actions = actions;
  operationSubActions = operationSubActions;
  activeAction = signal<string | null>(null);
  activeSubAction = signal<string | null>(null);
  modalTitle = computed(() => {
    if (this.activeAction() === 'operation-adjustment') {
      return `${this.actionText()} - ${getOperationSubActionByKey(this.activeSubAction()!)?.name}`;
    }
    return this.actionText();
  });
  actionText = computed(() => {
    if (this.modalConfig().action === 'edit') {
      if (this.modalConfig().eventModalVisible) {
        return '修改事件';
      }
      return '修改运营调整';
    }
    return getActionByKey(this.activeAction() || '')?.name || '';
  });
  isOperationSubAction = computed(() =>
    isOperationSubAction(this.activeAction()),
  );

  handlingLine = signal<string | null>(null);

  intervalUpdateTyphoon$ = interval(5000);
  intervalUpdateData$ = interval(5000);
  intervalUpdateDataSubscription?: Subscription;
  intervalUpdateTyphoonSubscription?: Subscription;

  handleAction(key: string) {
    const prev = this.activeAction();
    if (prev === key) {
      this.activeAction.set(null);
    } else {
      this.activeAction.set(key);
      switch (key) {
        case 'add-event':
          this.addEvent();
          break;
        case 'simulate-patrolling':
          this.openSimulatePatrollingModal();
          break;
        default:
          break;
      }
    }
  }

  handleSubAction(key: string) {
    this.activeSubAction.set(key);
    this.addOperation();
  }
  clearAction() {
    this.activeAction.set(null);
  }
  queryToConfirm$ = this.occEventBusService.on(OccEventType.QUERY_TO_CONFIRM);
  disableConfirm$ = this.occEventBusService.on(OccEventType.DISABLE_CONFIRM);
  readImages$ = this.occEventBusService.on(OccEventType.READ_IMAGES);
  eventUpdate$ = this.occEventBusService.on(OccEventType.EVENT_UPDATE);
  eventTerminate$ = this.occEventBusService.on(OccEventType.EVENT_TERMINATE);
  operationUpdate$ = this.occEventBusService.on(OccEventType.OPERATION_UPDATE);
  operationPartialUpdate$ = this.occEventBusService.on(
    OccEventType.OPERATION_PARTIAL_UPDATE,
  );
  eventEdit$ = this.occEventBusService.on(OccEventType.EVENT_EDIT);
  operationEdit$ = this.occEventBusService.on(OccEventType.OPERATION_EDIT);
  eventRemove$ = this.occEventBusService.on(OccEventType.EVENT_REMOVE);
  operationRemove$ = this.occEventBusService.on(OccEventType.OPERATION_REMOVE);

  constructor(
    private nzImageService: NzImageService,
    private api: ApiService,
    private setting: SettingService,
    private storage: StorageService,
    private occEventBusService: OccEventBusService,
    private commandService: CommandService,
    private occMapLocateService: OccMapLocateService,
    private occTyphoonService: OccTyphoonService,
    private message: NzMessageService,
    private router: Router,
  ) {
    const busMap = new Map<Observable<any>, (p: any) => void>();
    busMap.set(this.queryToConfirm$, this.queryToConfirm);
    busMap.set(this.disableConfirm$, this.disableConfirm);
    busMap.set(this.readImages$, this.readImages);
    busMap.set(this.eventUpdate$, this.onEditEvent);
    busMap.set(this.eventTerminate$, this.onTerminateEvent);
    busMap.set(this.operationUpdate$, this.onEditOperation);
    busMap.set(this.operationPartialUpdate$, this.onPartialUpdateOperation);
    busMap.set(this.eventEdit$, this.editEvent);
    busMap.set(this.operationEdit$, this.editOperation);
    busMap.set(this.eventRemove$, this.removeEvent);
    busMap.set(this.operationRemove$, this.removeOperation);

    busMap.forEach((handler, observable) => {
      observable.subscribe(handler.bind(this));
    });
  }
  async ngOnInit() {
    this.validateCommandPlatform('未开启指挥台');
    this.validateOccAuth();
  }

  async validateOccAuth() {
    await this.setting.init();
    if (!this.setting.isOccAdmin && !this.setting.isAdmin) {
      this.message.error('您没有权限访问此页面');
      this.router.navigate(['/portal']);
    }
  }

  setTerminateButtonPosition() {
    this.dockConfig.update((prev) => ({
      ...prev,
      y: document.documentElement.clientHeight - 48 - 45,
    }));
  }
  readImages(p: { images: string[] }) {
    this.nzImageService.preview(
      p.images.map((i) => {
        return {
          src: '/api' + i,
        };
      }),
      { nzZoom: 1, nzRotate: 0 },
    );
  }

  ngAfterViewInit() {
    this.setTerminateButtonPosition();
    this.setDocumentElementStyles();
  }
  ngOnDestroy() {
    this.intervalUpdateDataSubscription?.unsubscribe();
    this.intervalUpdateTyphoonSubscription?.unsubscribe();
  }

  onEventListClick() {
    this.operationListModal?.close();
    this.eventListModal?.toggleVisible();
  }
  onOperationListClick() {
    this.eventListModal?.close();
    this.operationListModal?.toggleVisible();
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
      }
    } catch (error) {
      this.valid.set(false);
      this.message.info('指挥台检测失败');
    }
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
    }, 1000);
    this.intervalUpdateTyphoonSubscription =
      this.intervalUpdateTyphoon$.subscribe(() => {
        this.updateTyphoonPosition();
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
      this.updateCenterState(current?.frame);
    }
  }
  readonly state = signal({
    name: '',
    text: '',
  });
  updateCenterState(s: ITyphoonState) {
    const { name, unitKey } = this.occTyphoonService;
    this.state.update((pre) => ({
      ...pre,
      name: name,
      text: `${unitKey}${name}${s.strong === name ? '' : s.strong}`,
    }));
  }
  throwErrorWhenInvalid() {
    if (!this.valid()) {
      this.message.error('未开启指挥台');
      throw new Error('未开启指挥台');
    }
  }
  async fetchEventList() {
    const eventInfo = await this.api.extreme.getOccEventInfo(
      this.currentLine(),
    );
    const events = eventInfo.list;
    const filteredEvents = events.filter((e) => e.line === this.currentLine());
    this.events.set(filteredEvents);
    this.eventStatistics.set(eventInfo);
    this.occEventBusService.dispatch({
      type: OccEventType.EVENTS_FETCHED,
      payload: filteredEvents,
    });
  }

  async fetchOperationList() {
    const operations = await this.api.extreme.getOccOperationList();
    const filteredOperations = operations.filter(
      (o) => o.line === this.currentLine(),
    );
    this.operations.set(filteredOperations);
    this.occEventBusService.dispatch({
      type: OccEventType.OPERATIONS_FETCHED,
      payload: filteredOperations,
    });
  }
  onLineChange(line: string) {
    this.currentLine.set(line);
    // localStorage.setItem('currentLine', line);
    this.storage.setString('occAdminLine', line);
    setTimeout(() => {
      window.location.reload();
    }, 200);
  }
  setDocumentElementStyles() {
    document.documentElement.style.setProperty('margin', '0 auto');
    document.documentElement.style.setProperty('position', 'relative');
    document.documentElement.style.setProperty('overflow', 'hidden');
    const fontText = `-apple-system,
        Microsoft YaHe,
        "微软雅黑",
        "黑体",
        HeiTi`;
    document.documentElement.style.setProperty('font-family', fontText);
    document.body.style.setProperty('font-family', fontText);
  }

  onModalClose() {
    this.modalConfig.update((prev) => ({
      ...prev,
      visible: false,
    }));
    this.clearAction();
  }
  onModalAdd() {}
  onModalSubmit() {
    this.throwErrorWhenInvalid();
    if (this.modalConfig().eventModalVisible) {
      this.eventModal?.submit();
    } else {
      this.operationModal?.submit();
    }
  }
  addEvent() {
    this.modalConfig.update((prev) => ({
      ...prev,
      action: 'add',
      visible: true,
      eventModalVisible: true,
      operationModalVisible: false,
    }));
  }
  editEvent(event: Partial<ExtremeOcc.Event>) {
    this.modalConfig.update((prev) => ({
      ...prev,
      action: 'edit',
      visible: true,
      eventModalVisible: true,
      operationModalVisible: false,
      data: event,
    }));
  }
  addOperation() {
    this.modalConfig.update((prev) => ({
      ...prev,
      action: 'add',
      visible: true,
      eventModalVisible: false,
      operationModalVisible: true,
    }));
  }

  editOperation(operation: Partial<ExtremeOcc.Operation>) {
    this.modalConfig.update((prev) => ({
      ...prev,
      action: 'edit',
      visible: true,
      eventModalVisible: false,
      operationModalVisible: true,
      data: operation,
    }));
  }

  eventUpdate(p: Partial<ExtremeOcc.Event>, callback?: () => void) {
    this.api.extreme.updateOccEvent(p).then(() => {
      this.message.success(`事件${p.terminated ? '结束' : '更新'}成功`);
      callback?.();
    });
  }
  onEditEvent(p: Partial<ExtremeOcc.Event>) {
    if (p.terminated) return this.message.error('该事件已结束，无法修改');
    return this.eventUpdate(p, () => {
      this.onModalClose();
      this.fetchEventList();
    });
  }
  onTerminateEvent(p: Partial<ExtremeOcc.Event>) {
    return this.eventUpdate(p, () => {
      this.onModalClose();
      this.fetchEventList();
    });
  }
  operationUpdate(p: Partial<ExtremeOcc.Operation>, callback?: () => void) {
    this.api.extreme.updateOccOperation(p).then(() => {
      this.message.success('运营调整更新成功');
      callback?.();
    });
  }
  onPartialUpdateOperation(
    p: Partial<ExtremeOcc.Operation> & { id: string },
    callback?: () => void,
  ) {
    this.api.extreme.partialUpdateOperation(p).then(() => {
      this.message.success('运营调整更新成功');
      callback?.();
    });
  }
  onEditOperation(p: Partial<ExtremeOcc.Operation>) {
    return this.operationUpdate(p, () => {
      this.onModalClose();
      this.fetchOperationList();
    });
  }

  removeEvent(event: ExtremeOcc.Event) {
    this.api.extreme.removeOccEvent(event.id).then(() => {
      this.message.success('事件删除成功');
      this.fetchEventList();
    });
  }
  removeOperation(operation: ExtremeOcc.Operation) {
    this.api.extreme.removeOccOperation(operation.id).then(() => {
      this.message.success('运营调整删除成功');
      this.fetchOperationList();
    });
  }

  openSimulatePatrollingModal() {
    this.simulatePatrollingModalConfig.update((prev) => ({
      ...prev,
      visible: true,
      data: {
        line: this.currentLine(),
      },
    }));
  }
  closeSimulatePatrollingModal() {
    this.simulatePatrollingModalConfig.update((prev) => ({
      ...prev,
      visible: false,
    }));
    this.clearAction();
  }
  onLocate(p: {
    type: number;
    line: string;
    values?: { startStation?: string; endStation?: string };
  }) {
    if (this.modalConfig().eventModalVisible && p.type === 2) {
      this.occMapLocateService.setLocationType(
        4,
        p.values
          ? {
              startStation: this.getStationMetaByName(p.values!.startStation!),
              endStation: this.getStationMetaByName(p.values!.endStation!),
            }
          : undefined,
      );
    } else {
      this.occMapLocateService.setLocationType(p.type);
    }
    this.handlingLine.set(p.line);
    switch (p.type) {
      case 0:
        this.terminateLocate(p.line);
        break;
      case 1:
        this.onLocateSingleStation(p.line);
        break;
      case 2:
        this.onLocateIntervalStation(p.line);
        break;
      case 3:
        this.onLocateCustomPosition();
        break;
    }
  }
  getStationMetaByName(name: string) {
    return this.mapComponent?.currentLineModel?.stations.find(
      (s) => s.name === name,
    )?.meta;
  }
  onLocateSingleStation(line: string) {
    this.temporaryHideOverlays();
    this.messageTip?.showMessage('请选择站点');
    this.mapComponent?.onLocate(1, line);
  }
  onLocateIntervalStation(line: string) {
    this.temporaryHideOverlays();
    this.messageTip?.showMessage('请选择起始站点/选择结束站点');
    this.mapComponent?.onLocate(2, line);
  }

  onLocateCustomPosition() {
    this.temporaryHideOverlays();
    this.messageTip?.showMessage('请选择自定义位置');
    this.mapComponent?.onLocate(3, this.currentLine());
  }

  onLocateIntervalCustom() {
    setTimeout(() => {
      this.messageTip?.showMessage('请选择区间显示位置');
    }, 300);
    this.mapComponent?.onLocate(3, this.currentLine());
  }

  onLocatePatrolling() {
    this.messageTip?.showMessage('请选择起始站点/选择结束站点');
  }

  showMessage(msg: string) {
    this.messageTip?.showMessage(msg);
  }

  queryToConfirm(boolean = true) {
    this.messageTip?.handleQuery(boolean);
  }
  disableConfirm() {
    this.messageTip?.handleQuery(false);
  }
  removeMessage() {
    this.messageTip?.hideMessage();
  }

  onCancelLocating() {
    if (this.isOnPatrollingAction()) {
      this.simulatePatrollingComponent?.onMessageCancel();
      return;
    }
    this.terminateLocate(this.handlingLine() || '');
  }
  onConfirmLocating() {
    if (this.isOnPatrollingAction()) {
      this.simulatePatrollingComponent?.onMessageConfirm();
      return;
    }
    if (
      this.occMapLocateService.isIntervalCustom() &&
      this.occMapLocateService.isLocatingIntervalCustom()
    ) {
      this.onLocateIntervalCustom();
      return;
    }
    this.occEventBusService.dispatch({
      type: OccEventType.CONFIRM_LOCATE,
      payload: null,
    });
    this.terminateLocate(this.handlingLine() || '');
  }

  temporaryHideOverlays() {
    this.hideToSelect.set(true);
  }
  revertOverlays() {
    this.hideToSelect.set(false);
  }

  terminateLocate(line: string) {
    this.revertOverlays();
    this.messageTip?.hideMessage();
    this.mapComponent?.terminateLocate(line);
    this.occMapLocateService.removeAllLocationIcons();
  }
  onAddEvent(p: ExtremeOcc.EventAddParams) {
    this.api.extreme.addOccEvent(p).then(() => {
      this.message.success('新增事件成功');
      this.onModalClose();
      this.fetchEventList();
    });
  }
  onAddOperation(p: ExtremeOcc.OperationAddParams) {
    this.api.extreme.addOccOperation(p).then(() => {
      this.message.success('新增运营调整成功');
      this.onModalClose();
      this.fetchOperationList();
    });
  }
  backToPortal() {
    this.router.navigate(['/portal']);
  }
}
