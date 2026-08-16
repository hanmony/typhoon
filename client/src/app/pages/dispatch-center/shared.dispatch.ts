import { Component, computed, signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { NzMessageService } from 'ng-zorro-antd/message';
import {
  debounceTime,
  distinctUntilChanged,
  fromEvent,
  interval,
  Subscription,
  tap,
} from 'rxjs';
import { ApiService } from '../../services/api.service';
import { SettingService } from '../../services/setting.service';
import { ITyphoonState } from '../case-detail/services/meta';
import { CommandService } from '../occ/map/command.service';
import { OccTyphoonService } from '../occ/map/typhoon.occ.service';
import { OccEventType } from '../occ/occ.event-bus.model';
import { OccEventBusService } from '../occ/occ.event-bus.service';

@Component({
  selector: '',
  imports: [],
  template: '',
  styles: '',
})
export class DispatchSharedComponent {
  state = signal({
    name: '',
    enName: '',
    unitKey: '',
    strong: '',
    text: '',
  });

  simulatedPatrollingVisible = signal(false);
  toggleSimulatedPatrollingVisible() {
    this.simulatedPatrollingVisible.set(!this.simulatedPatrollingVisible());
  }
  closeSimulatedPatrollingVisible() {
    this.simulatedPatrollingVisible.set(false);
  }

  private _screenSize = signal({
    width: 3840,
    height: 1080,
  });
  readonly screenSize = computed(() => this._screenSize());
  readonly standardScreenSize = Object.freeze({
    width: 3840,
    height: 1080,
  });

  scale = computed(() => {
    return 1;
  });

  resize$ = fromEvent(window, 'resize').pipe(
    debounceTime(100),
    distinctUntilChanged(),
    tap(() => this.setScreenSize()),
  );

  valid = signal(false);
  events = signal<ExtremeOcc.Event[]>([]);
  operations = signal<ExtremeOcc.Operation[]>([]);

  filteredEvents = computed(() => {
    return this.events().filter((ev) => !!ev.isShow);
  });

  filteredOperations = computed(() => {
    return this.operations().filter((ev) => !!ev.isShow);
  });

  intervalUpdateTyphoon$ = interval(60000);
  intervalUpdateData$ = interval(5000);
  intervalUpdateDataSubscription?: Subscription;
  intervalUpdateTyphoonSubscription?: Subscription;

  constructor(
    private api: ApiService,
    private setting: SettingService,
    private occTyphoonService: OccTyphoonService,
    private commandService: CommandService,
    private occEventBusService: OccEventBusService,
    private message: NzMessageService,
    readonly activatedRoute: ActivatedRoute,
    private router: Router,
  ) {
    this.resize$.subscribe();
  }

  ngOnInit() {
    this.validateCommandPlatform();
    this.validateDispatchCenterAuth();
  }

  async validateDispatchCenterAuth() {
    await this.setting.init();
    if (!this.setting.isCommandAdmin && !this.setting.isAdmin) {
      this.message.error('您没有权限访问此页面');
      this.router.navigate(['/portal']);
    }
  }
  ngAfterViewInit() {
    this.setScreenSize();
    this.setDocumentElementStyles();
  }

  ngOnDestroy() {
    this.intervalUpdateDataSubscription?.unsubscribe();
    this.intervalUpdateTyphoonSubscription?.unsubscribe();
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
    const { name, enName, unitKey } = this.occTyphoonService;
    if (!name) return; // 无匹配台风，保持 setCommandName 设置的自定义名称
    this.state.update((pre) => ({
      ...pre,
      name: name,
      enName: enName,
      unitKey: unitKey,
      strong: s.strong || '',
      text: `${unitKey}${name}${s.strong === name ? '' : s.strong}`,
    }));
  }

  async fetchEventList() {
    const events = await this.api.extreme.getOccEvents();
    this.events.set(events);
    this.occEventBusService.dispatch({
      type: OccEventType.EVENTS_FETCHED,
      payload: events,
    });
  }

  async fetchOperationList() {
    const operations = await this.api.extreme.getOccOperationList();
    this.operations.set(operations);
    this.occEventBusService.dispatch({
      type: OccEventType.OPERATIONS_FETCHED,
      payload: operations,
    });
  }

  locateEvent(ev: ExtremeOcc.Event) {
    // this.mapRef?.locateEvent(ev);
    throw new Error('Method not implemented.');
  }

  getScreenSize() {
    return {
      width: document.documentElement.clientWidth,
      height: document.documentElement.clientHeight,
    };
  }
  setScreenSize() {
    const size = this.getScreenSize();
    this._screenSize.set(size);
    return size;
  }
  setDocumentElementStyles() {
    document.documentElement.style.setProperty('margin', '0 auto');
    document.documentElement.style.setProperty('position', 'relative');
    document.documentElement.style.setProperty('overflow-x', 'auto');
    document.documentElement.style.setProperty('overflow-y', 'auto');
    document.documentElement.style.setProperty('zoom', this.scale().toString());
    document.documentElement.style.setProperty(
      'width',
      `${this.standardScreenSize.width}px`,
    );
    document.documentElement.style.setProperty(
      'height',
      `${this.standardScreenSize.height}px`,
    );
    const fontText = `-apple-system,
        Microsoft YaHe,
        "微软雅黑",
        "黑体",
        HeiTi`;
    document.documentElement.style.setProperty('font-family', fontText);
    document.body.style.setProperty('font-family', fontText);
  }
}
