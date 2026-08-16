import {
  Component,
  computed,
  OnDestroy,
  OnInit,
  signal,
  TemplateRef,
  ViewChild,
} from '@angular/core';
import { Router } from '@angular/router';
import ExcelJS from 'exceljs';
import { NzImageService } from 'ng-zorro-antd/image';
import { NzMessageService } from 'ng-zorro-antd/message';
import { NzModalService } from 'ng-zorro-antd/modal';
import { interval, Observable, Subscription } from 'rxjs';
import { TyphoonNameComponent } from '../../common.component/typhoon-name/typhoon-name.component';
import { CommonNzModule } from '../../common.nz.module';
import {
  transformActiveTyphoonToTyphoonListItem,
  transformWeatherAlertToWeatherDto,
} from '../../services/apis/extreme';
import { ITyphoonState } from '../case-detail/services/meta';
import { EmergencyResponseModalComponent } from '../occ/emergency-response-modal/emergency-response-modal.component';
import { OccEventModalComponent } from '../occ/event-modal/event-modal.component';
import { OccMapLocateService } from '../occ/map/locate.occ.service';
import { OccTyphoonService } from '../occ/map/typhoon.occ.service';
import { OccMessageTipComponent } from '../occ/message-tip/message-tip.component';
import { OccEventType } from '../occ/occ.event-bus.model';
import { OccEventBusService } from '../occ/occ.event-bus.service';
import { OccOperationModalComponent } from '../occ/operation-modal/operation-modal.component';
import { DraggableComponent } from './../../common.component/draggable/draggable.component';
import { LibraryNzModule } from './../../library.nz.module';
import { ApiService } from './../../services/api.service';
import { SettingService } from './../../services/setting.service';
import { CommandService } from './../occ/map/command.service';
import { OccModalWrapperComponent } from './../occ/modal-wrapper/modal-wrapper.component';
import { AiChatOverlayService } from '../../services/ai-chat-overlay.service';
import {
  formatDutyDate,
  getDutyDates,
  groupDutyByDate,
} from './../../shared/duty.util';
import { CoccLeftScreenComponent } from './left-screen/left-screen.component';

@Component({
  selector: 'app-cocc',
  imports: [
    LibraryNzModule,
    CoccLeftScreenComponent,
    // CoccRightScreenComponent,
    OccMessageTipComponent,
    OccModalWrapperComponent,
    OccEventModalComponent,
    EmergencyResponseModalComponent,
    OccOperationModalComponent,
    DraggableComponent,
    TyphoonNameComponent,
    CommonNzModule,
  ],
  templateUrl: './cocc.component.html',
  styleUrl: './cocc.component.less',
})
export class CoccComponent implements OnInit, OnDestroy {
  @ViewChild(CoccLeftScreenComponent) leftScreen?: CoccLeftScreenComponent;
  @ViewChild(OccMessageTipComponent) messageTip?: OccMessageTipComponent;
  @ViewChild(OccEventModalComponent) eventModal?: OccEventModalComponent;
  @ViewChild(EmergencyResponseModalComponent)
  emergencyResponseModal?: EmergencyResponseModalComponent;
  @ViewChild(OccOperationModalComponent)
  operationModal?: OccOperationModalComponent;
  @ViewChild('passwordTpl') passwordRef!: TemplateRef<HTMLDivElement>;

  valid = signal(false);

  events = signal<ExtremeOcc.Event[]>([]);
  operations = signal<ExtremeOcc.Operation[]>([]);

  terminateButtonConfig = signal({
    width: 85,
    x: 408,
    y: 42,
  });

  hideToSelect = signal(false);

  modalConfig = signal<{
    action: 'add' | 'edit';
    visible: boolean;
    data: Partial<ExtremeOcc.Event> | Partial<ExtremeOcc.Operation> | null;
    eventModalVisible: boolean;
    operationModalVisible: boolean;
    emergencyResponseVisible: boolean;
  }>({
    action: 'add',
    visible: false,
    data: null,
    eventModalVisible: false,
    operationModalVisible: false,
    emergencyResponseVisible: false,
  });
  modalTitle = computed(() => {
    const { action, eventModalVisible, emergencyResponseVisible } =
      this.modalConfig();
    if (emergencyResponseVisible) return '防台防汛应急响应';
    const category = eventModalVisible ? '事件' : '运营调整';
    return `${action === 'add' ? '新增' : '编辑'}${category}`;
  });
  handlingLine = signal<string | null>(null);

  intervalUpdateTyphoon$ = interval(60000);
  intervalUpdateData$ = interval(5000);
  intervalUpdateDataSubscription?: Subscription;
  intervalUpdateTyphoonSubscription?: Subscription;

  queryToConfirm$ = this.occEventBusService.on(OccEventType.QUERY_TO_CONFIRM);
  disableConfirm$ = this.occEventBusService.on(OccEventType.DISABLE_CONFIRM);
  readImages$ = this.occEventBusService.on(OccEventType.READ_IMAGES);
  eventUpdate$ = this.occEventBusService.on(OccEventType.EVENT_UPDATE);
  eventPartialUpdate$ = this.occEventBusService.on(
    OccEventType.EVENT_PARTIAL_UPDATE,
  );
  eventTerminate$ = this.occEventBusService.on(OccEventType.EVENT_TERMINATE);
  operationUpdate$ = this.occEventBusService.on(OccEventType.OPERATION_UPDATE);
  operationPartialUpdate$ = this.occEventBusService.on(
    OccEventType.OPERATION_PARTIAL_UPDATE,
  );
  eventEdit$ = this.occEventBusService.on(OccEventType.EVENT_EDIT);
  operationEdit$ = this.occEventBusService.on(OccEventType.OPERATION_EDIT);
  eventRemove$ = this.occEventBusService.on(OccEventType.EVENT_REMOVE);
  operationRemove$ = this.occEventBusService.on(OccEventType.OPERATION_REMOVE);

  showNextStep = signal(false);

  constructor(
    private nzImageService: NzImageService,
    private api: ApiService,
    private setting: SettingService,
    private occEventBusService: OccEventBusService,
    private commandService: CommandService,
    private occMapLocateService: OccMapLocateService,
    private occTyphoonService: OccTyphoonService,
    private message: NzMessageService,
    private modal: NzModalService,
    private router: Router,
    private aiChatOverlay: AiChatOverlayService,
  ) {
    const busMap = new Map<Observable<any>, (p: any) => void>();
    busMap.set(this.queryToConfirm$, this.queryToConfirm);
    busMap.set(this.disableConfirm$, this.disableConfirm);
    busMap.set(this.readImages$, this.readImages);
    busMap.set(this.eventUpdate$, this.onEditEvent);
    busMap.set(this.eventPartialUpdate$, this.onPartialUpdateEvent);
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

    commandService.commandSetupSubject$.subscribe(() => {
      const nextStep = commandService.nextSimulateStep;
      if (nextStep) {
        this.showNextStep.set(true);
      }
    });
  }
  async onNextStep() {
    await this.commandService.simulateNextStep();
  }

  ngOnInit() {
    this.validateCommandPlatform('未开启指挥台');
    this.validateCoccAuth();
    // 对齐 terminate-button 右边缘（clientWidth - 572 + 85 = clientWidth - 487），距底部 100px
    this.aiChatOverlay.initButton({
      position: { bottom: '100px', right: '521px' },
      panelPosition: { top: '10vh', right: '0', width: 800, height: '80vh' },
    });
  }

  async validateCoccAuth() {
    await this.setting.init();
    if (!this.setting.isCoccAdmin && !this.setting.isAdmin) {
      this.message.error('您没有权限访问此页面');
      this.router.navigate(['/portal']);
    }
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

  onTerminateButtonClickOld() {
    this.password.set('');
    this.modal.confirm({
      nzClassName: 'cocc-terminate-command-modal',
      nzTitle: '确定结束指挥吗？',
      nzContent: this.passwordRef,
      nzOnOk: async () => this.terminateCommand(),
    });
  }

  onTerminateButtonClick() {
    this.password.set('');
    const modalRef = this.modal.create({
      nzClassName: 'cocc-terminate-command-modal',
      nzTitle: '确定结束指挥吗？',
      nzContent: this.passwordRef,
      nzFooter: [
        {
          label: '导出指挥数据',
          type: 'primary',
          onClick: () => {
            // 导出按钮点击事件
            this.export();
            modalRef.destroy();
          },
        },
        {
          label: '取消',
          onClick: () => modalRef.destroy(),
        },
        {
          label: '确定',
          type: 'primary',
          onClick: async () => {
            await this.terminateCommand();
            modalRef.destroy();
          },
        },
      ],
    });
  }

  password = signal('');
  passwordVisible = false;
  exporting: boolean = false;
  async terminateCommand() {
    if (this.password() !== 'COCC123') {
      this.message.error('密码错误');
      return Promise.reject();
    }
    this.api.extreme.terminateCommand().then(() => {
      this.message.success('指挥结束完成！');
      this.validateCommandPlatform();
      this.intervalUpdateDataSubscription?.unsubscribe();
      this.intervalUpdateTyphoonSubscription?.unsubscribe();
      // this.occEventBusService.dispatch({
      //   type: OccEventType.TERMINATE_COMMAND,
      //   payload: null,
      // });
    });
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

  ngAfterViewInit() {
    this.setDocumentElementStyles();
    this.terminateButtonConfig.update((prev) => ({
      ...prev,
      x: document.documentElement.clientWidth - 406 - 166,
    }));
  }

  ngOnDestroy() {
    this.aiChatOverlay.hideButton();
    this.intervalUpdateDataSubscription?.unsubscribe();
    this.intervalUpdateTyphoonSubscription?.unsubscribe();
  }

  init() {
    this.fetchEventList();
    this.fetchOperationList();

    setTimeout(() => {
      this.updateTyphoonPosition();
    }, 1000);

    this.intervalUpdateDataSubscription = this.intervalUpdateData$.subscribe(
      () => {
        this.fetchEventList();
        this.fetchOperationList();
      },
    );
    this.intervalUpdateTyphoonSubscription =
      this.intervalUpdateTyphoon$.subscribe(() => {
        this.updateTyphoonPosition();
      });
  }

  async fetchEventList() {
    const events = await this.api.extreme.getOccEvents();
    this.events.set(events);
    this.occEventBusService.dispatch({
      type: OccEventType.EVENTS_FETCHED,
      payload: events,
    });
  }

  async export() {
    this.exporting = true;
    const detail = await this.api.extreme.getTyphoonCommandDetail();
    //台风总览信息
    const sheet1Rows: any[] = [];
    const sheet2Rows: any[] = [];
    const sheet3Rows: any[] = [];
    const sheet4Rows: any[] = [];
    const sheet5Rows: any[] = [];
    const sheet6Rows: any[] = [];
    const sheet7Rows: any[] = [];
    const sheet8Rows: any[] = [];
    const sheet9Rows: any[] = [];
    const sheet10Rows: any[] = [];
    //指挥基础信息
    let title = detail.doc.name;
    sheet1Rows.push({
      指挥标题: detail.doc.name,
      开始时间: new Date(detail.doc.startTime),
      是否结束: detail.doc.status == 1 ? '是' : '否',
      是否模拟: detail.doc.isSimulated == 1 ? '是' : '否',
    });
    //台风值班列表（指挥开启当日 + 后 4 天，共 5 天）
    const dutyDates = getDutyDates(detail.doc.startTime);
    const dutyGroup = groupDutyByDate(detail.typhoonDutys, dutyDates);
    const dutyDepartments = Array.from(
      new Set(detail.typhoonDutys.map((item) => item.department)),
    );
    for (const department of dutyDepartments) {
      const row: Record<string, string> = { '公司/部门名称': department };
      for (const date of dutyDates) {
        row[date] = dutyGroup[date]?.[department] || '';
      }
      sheet2Rows.push(row);
    }
    //台风事件列表
    for (const event of detail.typhoonExtremeEvents) {
      sheet3Rows.push({
        事件ID: event.id,
        指挥ID: event.commandId,
        自定义位置: event.customPosition,
        事件说明: event.description,
        上下行: event.direction,
        起始站点: event.startStation,
        结束站点: event.endStation,
        事件类型: event.eventType,
        图片: event.images,
        地点类型: event.locationType,
        严重程度: event.severity,
        线路: event.line,
        其他时间: event.otherEvent,
        需要抢修: event.urgentRepair,
        发生时间: new Date(event.startTime),
        是否影响运营: event.effect,
        影响运营时间: event.effectDuration,
        列车号: event.trainNumber,
        来源: event.source,
        抢修单位: event.repairUnits,
        负责人: event.responsiblePerson,
        联系电话: event.contactPhone,
        督办: event.supervision,
        关联点: event.associatedPoint,
        抢修状态: event.urgentRepairStatus,
        是否显示: event.isShow,
        是否已结束: event.terminated,
        结束时间: new Date(event.endTime),
        创建时间: new Date(event.createTime),
        修改时间: new Date(event.updateTime),
      });
    }
    //台风消息列表
    for (const message of detail.typhoonExtremeMessages) {
      sheet4Rows.push({
        事件ID: message.id,
        指挥ID: message.commandId,
        标题: message.title,
        内容: message.content,
        类型: message.type,
        线路: message.lines,
        事件: message.eventIds,
        创建时间: new Date(message.createTime),
        修改时间: new Date(message.updateTime),
      });
    }
    //台风运营调整列表
    for (const operation of detail.typhoonExtremeOperations) {
      sheet5Rows.push({
        事件ID: operation.id,
        指挥ID: operation.commandId,
        车场位置: operation.customPosition,
        事件说明: operation.description,
        上下行: operation.direction,
        起始站点: operation.startStation,
        结束站点: operation.endStation,
        地点类型: operation.locationType,
        运营调整类型: operation.actionType,
        关闭: operation.close,
        距离: operation.distance,
        开始时间: new Date(operation.startTime),
        结束时间: new Date(operation.endTime),
        限制: operation.limit,
        线路: operation.line,
        来源: operation.source,
        是否计划恢复时间未定: operation.isEndTimeOptional,
        是否显示: operation.isShow,
        运营真实恢复时间: new Date(operation.actualEndTime),
        创建时间: new Date(operation.createTime),
      });
    }
    //台风巡道列表
    for (const patrolling of detail.typhoonPatrollings) {
      sheet6Rows.push({
        巡道ID: patrolling.id,
        线路: patrolling.line,
        路径信息: patrolling.identifiers,
        开始时间: new Date(patrolling.startTime),
        速度: patrolling.speed,
        序号: patrolling.serialNumber,
        创建时间: new Date(patrolling.createTime),
      });
    }
    //灾害天气列表
    const alerts = detail.severeWeathers.map(transformWeatherAlertToWeatherDto);
    for (const weather of alerts) {
      sheet7Rows.push({
        alertlevel: weather.alertlevel,
        alertlevels: weather.alertlevels,
        alertname: weather.alertname,
        alertnames: weather.alertnames,
        defenseguideline: weather.defenseguideline,
        forecaster: weather.forecaster,
        info: weather.info,
        preupdatelevel: weather.preupdatelevel,
        publishtime: weather.publishtime,
        publishtimes: weather.publishtimes,
        title: weather.title,
        warningstate: weather.warningstate,
        预警是否结束: weather.isEnd,
        预警结束时间: new Date(weather.endtime),
      });
    }
    const convertTyphoonInfo = transformActiveTyphoonToTyphoonListItem(
      detail.typhoon,
    );
    //台风基本信息
    sheet8Rows.push({
      tfid: convertTyphoonInfo.tfid,
      name: convertTyphoonInfo.name,
      enname: convertTyphoonInfo.enname,
      isactive: convertTyphoonInfo.isactive,
      warnlevel: convertTyphoonInfo.warnlevel,
      starttime: convertTyphoonInfo.starttime,
      endtime: convertTyphoonInfo.endtime,
      centerlat: convertTyphoonInfo.centerlat,
      centerlng: convertTyphoonInfo.centerlng,
    });
    //台风登陆信息
    debugger;
    for (const landingInfo of convertTyphoonInfo.land) {
      sheet9Rows.push({
        info: landingInfo.info,
        landaddress: landingInfo.landaddress,
        landtime: landingInfo.landtime,
        lat: landingInfo.lat,
        lng: landingInfo.lng,
        strong: landingInfo.strong,
      });
    }
    //台风坐标信息
    for (const point of convertTyphoonInfo.points) {
      sheet10Rows.push({
        ckposition: point.ckposition,
        forecast: point.forecast,
        jl: point.jl,
        lat: point.lat,
        lng: point.lng,
        movedirection: point.movedirection,
        movespeed: point.movespeed,
        power: point.power,
        pressure: point.pressure,
        radius7: point.radius7,
        radius10: point.radius10,
        radius12: point.radius12,
        speed: point.speed,
        strong: point.strong,
        time: point.time,
      });
    }

    const workbook = new ExcelJS.Workbook();

    //指挥标题	开始时间	是否结束	是否模拟
    const worksheet1 = workbook.addWorksheet('指挥基本信息');
    worksheet1.columns = [
      { header: '指挥标题', key: '指挥标题', width: 20 },
      {
        header: '开始时间',
        key: '开始时间',
        width: 20,
        style: { numFmt: 'yyyy-mm-dd hh:mm:ss' },
      },
      { header: '是否结束', key: '是否结束', width: 30 },
      { header: '是否模拟', key: '是否模拟', width: 15 },
    ];
    worksheet1.addRows(sheet1Rows);

    // 公司/部门名称 + 5 个值班日
    const worksheet2 = workbook.addWorksheet('台风值班列表');
    worksheet2.columns = [
      { header: '公司/部门名称', key: '公司/部门名称', width: 30 },
      ...dutyDates.map((date) => ({
        header: formatDutyDate(date),
        key: date,
        width: 15,
      })),
    ];
    worksheet2.addRows(sheet2Rows);

    //事件ID	事件说明	事件类型	地点类型	严重程度	线路	其他时间	需要抢修	发生时间	是否影响运营	影响运营时间	列车号	来源	抢修单位	负责人	联系电话	督办	关联点	抢修状态	是否显示	是否已结束	结束时间	创建时间	修改时间
    const worksheet3 = workbook.addWorksheet('台风事件列表');
    worksheet3.columns = [
      { header: '事件ID', key: '事件ID', width: 15 },
      { header: '事件说明', key: '事件说明', width: 15 },
      { header: '事件类型', key: '事件类型', width: 15 },
      { header: '地点类型', key: '地点类型', width: 15 },
      { header: '严重程度', key: '严重程度', width: 15 },
      { header: '线路', key: '线路', width: 15 },
      { header: '其他时间', key: '其他时间', width: 15 },
      { header: '需要抢修', key: '需要抢修', width: 15 },
      {
        header: '发生时间',
        key: '发生时间',
        width: 20,
        style: { numFmt: 'yyyy-mm-dd hh:mm:ss' },
      },
      { header: '是否影响运营', key: '是否影响运营', width: 15 },
      { header: '影响运营时间', key: '影响运营时间', width: 15 },
      { header: '列车号', key: '列车号', width: 15 },
      { header: '来源', key: '来源', width: 15 },
      { header: '抢修单位', key: '抢修单位', width: 15 },
      { header: '负责人', key: '负责人', width: 15 },
      { header: '联系电话', key: '联系电话', width: 15 },
      { header: '督办', key: '督办', width: 15 },
      { header: '关联点', key: '关联点', width: 15 },
      { header: '抢修状态', key: '抢修状态', width: 15 },
      { header: '是否显示', key: '是否显示', width: 15 },
      { header: '是否已结束', key: '是否已结束', width: 15 },
      {
        header: '结束时间',
        key: '结束时间',
        width: 20,
        style: { numFmt: 'yyyy-mm-dd hh:mm:ss' },
      },
      {
        header: '创建时间',
        key: '创建时间',
        width: 20,
        style: { numFmt: 'yyyy-mm-dd hh:mm:ss' },
      },
      {
        header: '修改时间',
        key: '修改时间',
        width: 20,
        style: { numFmt: 'yyyy-mm-dd hh:mm:ss' },
      },
    ];
    worksheet3.addRows(sheet3Rows);

    // 事件ID 指挥ID 标题	内容	类型	线路	事件	创建时间	修改时间
    const worksheet4 = workbook.addWorksheet('台风消息列表');
    worksheet4.columns = [
      { header: '事件ID', key: '事件ID', width: 15 },
      { header: '指挥ID', key: '指挥ID', width: 15 },
      { header: '标题', key: '标题', width: 15 },
      { header: '内容', key: '内容', width: 15 },
      { header: '类型', key: '类型', width: 15 },
      { header: '线路', key: '线路', width: 15 },
      { header: '事件', key: '事件', width: 15 },
      {
        header: '创建时间',
        key: '创建时间',
        width: 20,
        style: { numFmt: 'yyyy-mm-dd hh:mm:ss' },
      },
      {
        header: '修改时间',
        key: '修改时间',
        width: 20,
        style: { numFmt: 'yyyy-mm-dd hh:mm:ss' },
      },
    ];
    worksheet4.addRows(sheet4Rows);

    //   事件ID	指挥ID	车场位置	事件说明 	上下行	起始站点	结束站点	地点类型	运营调整类型	关闭	距离	开始时间	结束时间	限制	线路	来源	是否计划恢复时间未定	是否显示	运营真实恢复时间	创建时间
    const worksheet5 = workbook.addWorksheet('台风运营调整列表');
    worksheet5.columns = [
      { header: '事件ID', key: '事件ID', width: 15 },
      { header: '指挥ID', key: '指挥ID', width: 15 },
      { header: '车场位置', key: '车场位置', width: 15 },
      { header: '事件说明', key: '事件说明', width: 15 },
      { header: '上下行', key: '上下行', width: 15 },
      { header: '起始站点', key: '起始站点', width: 15 },
      { header: '结束站点', key: '结束站点', width: 15 },
      { header: '地点类型', key: '地点类型', width: 15 },
      { header: '运营调整类型', key: '运营调整类型', width: 15 },
      { header: '关闭', key: '关闭', width: 15 },
      { header: '距离', key: '距离', width: 15 },
      {
        header: '开始时间',
        key: '开始时间',
        width: 20,
        style: { numFmt: 'yyyy-mm-dd hh:mm:ss' },
      },
      {
        header: '结束时间',
        key: '结束时间',
        width: 20,
        style: { numFmt: 'yyyy-mm-dd hh:mm:ss' },
      },
      { header: '限制', key: '限制', width: 15 },
      { header: '线路', key: '线路', width: 15 },
      { header: '来源', key: '来源', width: 15 },
      {
        header: '是否计划恢复时间未定',
        key: '是否计划恢复时间未定',
        width: 15,
      },
      { header: '是否显示', key: '是否显示', width: 15 },
      {
        header: '运营真实恢复时间',
        key: '运营真实恢复时间',
        width: 20,
        style: { numFmt: 'yyyy-mm-dd hh:mm:ss' },
      },
      {
        header: '创建时间',
        key: '创建时间',
        width: 20,
        style: { numFmt: 'yyyy-mm-dd hh:mm:ss' },
      },
    ];
    worksheet5.addRows(sheet5Rows);

    // 巡道ID	线路	路径信息	开始时间	速度	序号	创建时间
    const worksheet6 = workbook.addWorksheet('台风巡道列表');
    worksheet6.columns = [
      { header: '巡道ID', key: '巡道ID', width: 15 },
      { header: '线路', key: '线路', width: 15 },
      { header: '路径信息', key: '路径信息', width: 15 },
      {
        header: '开始时间',
        key: '开始时间',
        width: 20,
        style: { numFmt: 'yyyy-mm-dd hh:mm:ss' },
      },
      { header: '速度', key: '速度', width: 15 },
      { header: '序号', key: '序号', width: 15 },
      {
        header: '创建时间',
        key: '创建时间',
        width: 20,
        style: { numFmt: 'yyyy-mm-dd hh:mm:ss' },
      },
    ];
    worksheet6.addRows(sheet6Rows);

    // alertlevel	alertlevels	alertname	alertnames	defenseguideline	forecaster	info	preupdatelevel	publishtime	publishtimes	title	warningstate	预警是否结束	预警结束时间
    const worksheet7 = workbook.addWorksheet('灾害天气列表');
    worksheet7.columns = [
      { header: 'alertlevel', key: 'alertlevel', width: 15 },
      { header: 'alertlevels', key: 'alertlevels', width: 15 },
      { header: 'alertname', key: 'alertname', width: 15 },
      { header: 'alertnames', key: 'alertnames', width: 15 },
      { header: 'defenseguideline', key: 'defenseguideline', width: 15 },
      { header: 'forecaster', key: 'forecaster', width: 15 },
      { header: 'info', key: 'info', width: 15 },
      { header: 'preupdatelevel', key: 'preupdatelevel', width: 15 },
      { header: 'publishtime', key: 'publishtime', width: 15 },
      { header: 'publishtimes', key: 'publishtimes', width: 15 },
      { header: 'title', key: 'title', width: 15 },
      { header: 'warningstate', key: 'warningstate', width: 15 },
      { header: '预警是否结束', key: '预警是否结束', width: 15 },
      {
        header: '预警结束时间',
        key: '预警结束时间',
        width: 20,
        style: { numFmt: 'yyyy-mm-dd hh:mm:ss' },
      },
    ];
    worksheet7.addRows(sheet7Rows);

    // tfid	name	enname	isactive	warnlevel	starttime	endtime	centerlat	centerlng
    const worksheet8 = workbook.addWorksheet('台风基本信息');
    worksheet8.columns = [
      { header: 'tfid', key: 'tfid', width: 15 },
      { header: 'name', key: 'name', width: 15 },
      { header: 'enname', key: 'enname', width: 15 },
      { header: 'isactive', key: 'isactive', width: 15 },
      { header: 'warnlevel', key: 'warnlevel', width: 15 },
      { header: 'starttime', key: 'starttime', width: 15 },
      { header: 'endtime', key: 'endtime', width: 15 },
      { header: 'centerlat', key: 'centerlat', width: 15 },
      { header: 'centerlng', key: 'centerlng', width: 15 },
    ];
    worksheet8.addRows(sheet8Rows);

    //  info landaddress landtime lat lng strong
    const worksheet9 = workbook.addWorksheet('台风登陆信息');
    worksheet9.columns = [
      { header: 'info', key: 'info', width: 15 },
      { header: 'landaddress', key: 'landaddress', width: 15 },
      { header: 'landtime', key: 'landtime', width: 15 },
      { header: 'lat', key: 'lat', width: 15 },
      { header: 'lng', key: 'lng', width: 15 },
    ];
    worksheet9.addRows(sheet9Rows);

    // ckposition forecast jl lat lng movedirection movespeed power pressure radius7 radius10 radius12 speed strong time
    const worksheet10 = workbook.addWorksheet('台风坐标信息');
    worksheet10.columns = [
      { header: 'ckposition', key: 'ckposition', width: 15 },
      { header: 'forecast', key: 'forecast', width: 15 },
      { header: 'jl', key: 'jl', width: 15 },
      { header: 'lat', key: 'lat', width: 15 },
      { header: 'lng', key: 'lng', width: 15 },
      { header: 'movedirection', key: 'movedirection', width: 15 },
      { header: 'movespeed', key: 'movespeed', width: 15 },
      { header: 'power', key: 'power', width: 15 },
      { header: 'pressure', key: 'pressure', width: 15 },
      { header: 'radius7', key: 'radius7', width: 15 },
      { header: 'radius10', key: 'radius10', width: 15 },
      { header: 'radius12', key: 'radius12', width: 15 },
      { header: 'speed', key: 'speed', width: 15 },
      { header: 'strong', key: 'strong', width: 15 },
      { header: 'time', key: 'time', width: 15 },
    ];
    worksheet10.addRows(sheet10Rows);

    // 在浏览器中，我们使用 writeBuffer 方法
    workbook.xlsx.writeBuffer().then((buffer) => {
      // 创建一个Blob对象
      const blob = new Blob([buffer], {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      });
      // 创建一个下载链接
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${title}_指挥数据_${new Date().getTime()}.xlsx`;
      a.click();
      // 释放URL对象
      window.URL.revokeObjectURL(url);
    });

    this.exporting = false;
    this.message.success('导出成功');
  }

  async fetchOperationList() {
    const operations = await this.api.extreme.getOccOperationList();
    this.operations.set(operations);
    this.occEventBusService.dispatch({
      type: OccEventType.OPERATIONS_FETCHED,
      payload: operations,
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
  /**
   * 指挥台校验成功后立即设置显示名称。
   * 无台风（自定义指挥名称）时也能显示，不依赖台风帧。
   */
  setCommandName() {
    const commandName = this.occTyphoonService.commandName;
    if (!commandName) return;
    this.state.update((pre) => ({
      ...pre,
      name: commandName,
      text: pre.text || commandName,
    }));
  }
  updateCenterState(s: ITyphoonState) {
    const { name, unitKey } = this.occTyphoonService;
    if (!name) return; // 无匹配台风，保持 setCommandName 设置的自定义名称
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

  onModalSubmit() {
    this.throwErrorWhenInvalid();
    if (this.modalConfig().emergencyResponseVisible) {
      this.emergencyResponseModal?.submit();
      return;
    }
    if (this.modalConfig().eventModalVisible) {
      this.eventModal?.submit();
    } else {
      this.operationModal?.submit();
    }
  }

  onModalClose() {
    this.modalConfig.update((prev) => ({
      ...prev,
      visible: false,
    }));
  }

  onEventListAdd() {
    this.addEvent();
  }
  onOperationListAdd() {
    this.addOperation();
  }
  addEvent() {
    this.modalConfig.update((prev) => ({
      ...prev,
      action: 'add',
      visible: true,
      eventModalVisible: true,
      operationModalVisible: false,
      emergencyResponseVisible: false,
    }));
  }
  editEvent(event: Partial<ExtremeOcc.Event>) {
    this.modalConfig.update((prev) => ({
      ...prev,
      action: 'edit',
      visible: true,
      eventModalVisible: true,
      operationModalVisible: false,
      emergencyResponseVisible: false,
      data: event,
    }));
  }
  editEmergencyResponse() {
    this.modalConfig.update((prev) => ({
      ...prev,
      visible: true,
      eventModalVisible: false,
      operationModalVisible: false,
      emergencyResponseVisible: true,
    }));
  }
  addOperation() {
    this.modalConfig.update((prev) => ({
      ...prev,
      action: 'add',
      visible: true,
      eventModalVisible: false,
      operationModalVisible: true,
      emergencyResponseVisible: false,
    }));
  }

  editOperation(operation: Partial<ExtremeOcc.Operation>) {
    this.modalConfig.update((prev) => ({
      ...prev,
      action: 'edit',
      visible: true,
      eventModalVisible: false,
      operationModalVisible: true,
      emergencyResponseVisible: false,
      data: operation,
    }));
  }

  eventUpdate(p: Partial<ExtremeOcc.Event>, callback?: () => void) {
    this.api.extreme.updateOccEvent(p).then(() => {
      this.message.success(`事件${p.terminated ? '结束' : '更新'}成功`);
      callback?.();
    });
  }
  eventPartialUpdate(
    p: Partial<ExtremeOcc.Event> & { id: string },
    callback?: () => void,
  ) {
    this.api.extreme.partialUpdateOccEvent(p).then(() => {
      this.message.success(`事件${p.terminated ? '结束' : '更新'}成功`);
      callback?.();
    });
  }
  onEditEvent(p: Partial<ExtremeOcc.Event>) {
    return this.eventUpdate(p, () => {
      this.onModalClose();
      this.fetchEventList();
    });
  }
  onPartialUpdateEvent(p: Partial<ExtremeOcc.Event> & { id: string }) {
    return this.eventPartialUpdate(p, () => {
      this.onModalClose();
      this.fetchEventList();
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
              startStation: this.getStationMetaByName(
                p.line,
                p.values!.startStation!,
              ),
              endStation: this.getStationMetaByName(
                p.line,
                p.values!.endStation!,
              ),
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
  getStationMetaByName(line: string, name: string) {
    const lineModel = this.leftScreen?.mapRef.lineModels.find(
      (m) => m.name === line,
    );
    if (!lineModel) return;

    return lineModel?.stations.find((s) => s.name === name)?.meta;
  }
  onLocateSingleStation(line: string) {
    this.temporaryHideOverlays();
    this.messageTip?.showMessage('请选择站点');
    this.leftScreen?.mapRef?.onLocate(1, line);
  }
  onLocateIntervalStation(line: string) {
    this.temporaryHideOverlays();
    this.messageTip?.showMessage('请选择起始站点/选择结束站点');
    this.leftScreen?.mapRef?.onLocate(2, line);
  }

  onLocateCustomPosition() {
    this.temporaryHideOverlays();
    this.messageTip?.showMessage('请选择自定义位置');
    this.leftScreen?.mapRef?.onLocate(3, this.handlingLine() || '');
  }

  onLocateIntervalCustom() {
    setTimeout(() => {
      this.messageTip?.showMessage('请选择区间显示位置');
    }, 300);
    this.leftScreen?.mapRef?.onLocate(3, this.handlingLine() || '');
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
    if (this.leftScreen?.simulatePatrollingModalVisible()) {
      this.leftScreen?.simulatePatrolling?.detail?.onMessageCancel();
      return;
    }
    this.terminateLocate(this.handlingLine() || '');
  }
  onConfirmLocating() {
    if (this.leftScreen?.simulatePatrollingModalVisible()) {
      this.leftScreen?.simulatePatrolling?.detail?.onMessageConfirm();
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
    this.leftScreen?.mapRef?.terminateLocate(line);
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

  getScreenSize() {
    return {
      width: document.documentElement.clientWidth,
      height: document.documentElement.clientHeight,
    };
  }

  setDocumentElementStyles() {
    document.documentElement.style.setProperty('margin', '0 auto');
    document.documentElement.style.setProperty('position', 'relative');
    document.documentElement.style.setProperty('overflow-x', 'auto');
    document.documentElement.style.setProperty('overflow-y', 'auto');
    const fontText = `-apple-system,
        Microsoft YaHe,
        "微软雅黑",
        "黑体",
        HeiTi`;
    document.documentElement.style.setProperty('font-family', fontText);
    document.body.style.setProperty('font-family', fontText);
  }
  backToPortal() {
    this.router.navigate(['/portal']);
  }
}
