import {
  Component,
  computed,
  signal,
  TemplateRef,
  ViewChild,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import dayjs from 'dayjs';
import { NzMessageService } from 'ng-zorro-antd/message';
import { NzModalService } from 'ng-zorro-antd/modal';
import { fromEvent } from 'rxjs';
import { debounceTime, distinctUntilChanged } from 'rxjs/operators';
import {
  getDummyTyphoonSimulateStartTime,
  getDummyTyphoonSource,
} from '../../../dummy/typhoon.source';
import { CommonNzModule } from '../../common.nz.module';
import { SettingService } from '../../services/setting.service';
import { ApiService } from './../../services/api.service';
import {
  DesktopSelectComponent,
  DesktopSelectOption,
} from './desktop-select/desktop-select.component';
import { WeatherCarouselComponent } from './weather-carousel/weather-carousel.component';

export interface ComponentState {
  name: string;
  enName: string;
  unitKey: string;
  updateTime: string;
  centerPosition: string;
  speed: string;
  power: string;
  centerPressure: string;
  moveSpeed: string;
  moveDirection: string;
  sevenLevelRadius: string;
  tenLevelRadius: string;
  twelveLevelRadius: string;
  radius: { level: string; radius: string }[];
}

const getEmptyState = (unitKey = '当前无台风'): ComponentState => ({
  name: '',
  enName: '',
  unitKey,
  updateTime: '',
  centerPosition: '',
  speed: '',
  power: '',
  centerPressure: '',
  moveSpeed: '',
  moveDirection: '',
  sevenLevelRadius: '',
  tenLevelRadius: '',
  twelveLevelRadius: '',
  radius: [],
});

@Component({
  selector: 'app-extreme-weather',
  imports: [CommonNzModule, DesktopSelectComponent, WeatherCarouselComponent],
  templateUrl: './extreme-weather.component.html',
  styleUrl: './extreme-weather.component.less',
})
export class ExtremeWeatherComponent {
  @ViewChild(WeatherCarouselComponent)
  weatherCarousel!: WeatherCarouselComponent;

  @ViewChild('queryCustomNameTpl')
  queryCustomNameTpl!: TemplateRef<HTMLDivElement>;

  resize$ = fromEvent(window, 'resize').pipe(
    debounceTime(100),
    distinctUntilChanged(),
    takeUntilDestroyed(),
  );

  actualTyphoonList: ExternalTyphoonWeb.TyphoonListItem[] = [];

  constructor(
    private message: NzMessageService,
    private api: ApiService,
    private setting: SettingService,
    private modal: NzModalService,
  ) {}

  ngOnInit() {
    this.resize$.subscribe(() => {
      this.resetScale();
    });
    this.fetchTyphoonList();
    // this.api.extreme.getMuifaInfo();
  }

  private _screenSize = signal({
    width: 1920,
    height: 1080,
  });
  readonly screenSize = computed(() => this._screenSize());
  readonly standardScreenSize = Object.freeze({
    width: 1920,
    height: 1080,
  });
  headline = computed(() => {
    if (this.selectedTab().includes('台风')) {
      return this.state().name;
    }
    return '其他气象';
  });

  state = signal<ComponentState>(getEmptyState());
  // 自定义开启 - 输入一个名称
  customName = signal('');

  otherWeatherName = signal('');
  customWeatherOptions = signal<{ name: string; icon: string }[]>([
    // { name: '哥斯拉', icon: '' },
  ]);
  weatherSelectOptions = signal<DesktopSelectOption[]>([
    {
      name: '蓝色',
      color: '#61A7D3',
      icon: 'assets/images/extreme-weather/option-icon-blue.png',
    },
    {
      name: '黄色',
      color: '#FFFF00',
      icon: 'assets/images/extreme-weather/option-icon-yellow.png',
    },
    {
      name: '橙色',
      color: '#FFBA00',
      icon: 'assets/images/extreme-weather/option-icon-orange.png',
    },
    {
      name: '红色',
      color: '#FF3A00',
      icon: 'assets/images/extreme-weather/option-icon-red.png',
    },
  ]);

  validated = signal(false);
  dummyTyphoonOptions = signal<DesktopSelectOption[]>([
    { name: '梅花' },
    { name: '贝碧嘉' },
    { name: '模拟' },
  ]);
  actualTyphoonOptions = signal<DesktopSelectOption[]>([]);

  selectOptions = computed<DesktopSelectOption[]>(() => {
    if (this.selectedTab() === '实时台风') {
      return this.actualTyphoonOptions();
    }
    if (this.selectedTab() === '模拟台风') {
      return this.dummyTyphoonOptions();
    }

    if (this.selectedTab() === '其他气象') {
      return this.weatherSelectOptions();
    }
    return [];
  });
  selectedValue = computed<string | number>(() => {
    if (this.selectedTab() === '台风') {
      return this.state().name;
    }
    return this.selectWeatherColor();
  });
  selectWeatherColor = signal<string>('');

  selectedTab = signal('实时台风'); // 防台防汛 - 实时台风，模拟台风 - 模拟台风，其他气象 - 其他气象

  selectWeatherValue = signal<string | number>('');

  onWeatherCarouselChange(value: string | number) {
    this.selectWeatherValue.set(value);
  }
  onOtherWeatherNameChange(event: Event) {
    this.otherWeatherName.set((event.target as HTMLInputElement).value);
  }
  onAddOtherWeather() {
    if (this.otherWeatherName()) {
      this.customWeatherOptions.update((options) => [
        {
          name: this.otherWeatherName(),
          icon: '',
        },
        ...options,
      ]);
      setTimeout(() => {
        this.weatherCarousel.turnTo(0);
      }, 100);
    }
  }
  onDeskSelectChange(value: string | number) {
    if (this.selectedTab().includes('台风')) {
      if (this.isCommandSimulation()) {
        if (this.state().name && value === this.state().name) {
          this.state.set(getEmptyState(''));
        } else {
          this.setSimulationStateByName(value.toString());
        }
      } else {
        if (this.state().name) {
          this.state.set(getEmptyState(''));
        } else {
          this.updateSelectedActualTyphoonState(value.toString());
        }
      }
    } else if (this.selectedTab() === '其他气象') {
      this.selectWeatherColor.set(value as string);
    }
  }

  setSimulationStateByName(name: string) {
    const source = getDummyTyphoonSource(name);
    const simulateStartTime = getDummyTyphoonSimulateStartTime(name);
    this.state.update((state) => ({
      ...state,
      name: source.name,
      unitKey: source.tfid,
      updateTime: dayjs().format('YYYY/MM/DD HH:mm:ss'), // 2024/09/14 14:00:00
    }));
    const certainState = source.points.find(
      (s) => s.time === simulateStartTime,
    );
    this.setStateByPath(certainState!);
  }
  getRadiusResult(radius7: string, radius10: string, radius12: string) {
    let radiusResult: { level: string; radius: string }[] = [];

    function getRadiusString(s: string) {
      const [ne, se, nw, sw] = s.split('|');
      const max = Math.max(...[ne, se, nw, sw].map(Number));
      const min = Math.min(...[ne, se, nw, sw].map(Number));
      return max === min ? min + '公里' : `${min}-${max}公里`;
    }
    if (radius7) {
      radiusResult.push({ level: '七级', radius: getRadiusString(radius7) });
    }
    if (radius10) {
      radiusResult.push({
        level: '十级',
        radius: getRadiusString(radius10),
      });
    }
    if (radius12) {
      radiusResult.push({
        level: '十二级',
        radius: getRadiusString(radius12),
      });
    }
    return radiusResult;
  }
  setStateByPath(et: ExternalTyphoonWeb.TyphoonPoint) {
    const radiusResult = this.getRadiusResult(
      et.radius7,
      et.radius10,
      et.radius12,
    );

    this.state.update((state) => {
      return {
        ...state,
        updateTime: dayjs().format('YYYY/MM/DD HH:mm:ss'), // 2024/09/14 14:00:00
        centerPosition: `${et.lat}° / ${et.lng}°`,
        speed: et.speed + '米/秒',
        power: et.power + '级',
        centerPressure: et.pressure + '百帕',
        moveSpeed: et.movespeed + '公里/小时',
        moveDirection: et.movedirection,
        radius: radiusResult,
      };
    });
  }

  onTabClick(tab: string) {
    this.selectedTab.set(tab);
    this.state.set(getEmptyState(tab === '模拟台风' ? '' : undefined));
  }

  ngAfterViewInit() {
    this.resetScale();
  }
  resetScale() {
    this.setScreenSize();
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
  scale = computed(() => {
    return Math.min(
      this.screenSize().width / this.standardScreenSize.width,
      this.screenSize().height / this.standardScreenSize.height,
    );
  });

  actionText = computed(() => {
    if (this.selectedTab() === '实时台风') {
      if (this.state().name) {
        return '开启防汛指挥';
      }
      return '开启实时指挥';
    }
    if (this.state().name) {
      return '开启模拟指挥';
    } else {
      return '进入指挥台';
    }
  });

  actionDisabled = computed(() => {
    // if (this.selectedTab() === '实时台风') {
    //   return false;
    // }
    // return !this.selectWeatherColor() || !this.selectWeatherValue();
    // return !this.state().name;
    return false;
  });

  updateSelectedActualTyphoonState(value: string) {
    const ty = this.actualTyphoonList.find((t) => t.name === value);
    if (ty) {
      const ls = ty.points[ty.points.length - 1];
      if (ls) {
        const radiusResult = this.getRadiusResult(
          ls.radius7,
          ls.radius10,
          ls.radius12,
        );
        this.state.update((state) => ({
          ...state,
          name: ty.name,
          enName: ty.enname,
          unitKey: ty.tfid,
          updateTime: dayjs(ls.time).format('YYYY/MM/DD HH:mm:ss'), // 2024/09/14 14:00:00
          centerPosition: `${ls.lat}° / ${ls.lng}°`,
          speed: ls.speed + '米/秒',
          power: ls.power + '级',
          centerPressure: ls.pressure + '百帕',
          moveSpeed: ls.movespeed + '公里/小时',
          moveDirection: ls.movedirection,
          radius: radiusResult,
        }));
      } else {
        this.state.set(getEmptyState());
      }
    } else {
      this.state.set(getEmptyState());
    }
  }

  onActionClick() {
    if (this.actionDisabled()) {
      return;
    }
    // if (this.state().enName === 'NAMELESS') {
    //   this.message.error('未命名台风无法开始指挥');
    //   return;
    // }
    if (this.isCommandSimulation()) {
      this.initiateCommandSimulation(this.state().name || '');
    } else {
      if (this.state().name) {
        this.initiateCommand(this.state().name);
      } else {
        this.queryCustomName();
      }
    }
  }
  queryCustomName() {
    this.customName.set('');
    this.modal.create({
      nzClassName: 'noop-modal',
      nzTitle: '开启实时指挥',
      nzContent: this.queryCustomNameTpl,
      // nzFooter: tplFooter,
      nzMaskClosable: false,
      nzClosable: false,
      nzOnOk: async () => {
        if (!this.customName()) {
          return Promise.reject();
        }
        return this.initiateCommand(this.customName());
      },
    });
  }

  async initiateCommandSimulation(name: string) {
    this.api.extreme
      .initiateCommandSimulation(name, getDummyTyphoonSimulateStartTime(name))
      .then(() => {
        this.message.success('开启模拟指挥成功, 即将跳转');
        setTimeout(() => {
          this.validAuthThanJump();
        }, 3000);
      });
  }

  validAuthThanJump() {
    if (this.setting.isOccAdmin) {
      window.location.href = '/occ';
      return;
    } else if (this.setting.isCoccAdmin) {
      window.location.href = '/cocc';
      return;
    } else if (this.setting.isCommandAdmin) {
      window.location.href = '/dispatch-center';
      return;
    } else if (this.setting.isAdmin) {
      window.location.href = '/cocc';
      return;
    }
    this.message.warning('账号无对应进入权限');
  }

  async initiateCommand(name: string) {
    this.api.extreme.initiateCommand(name).then(() => {
      this.message.success('开启防汛指挥成功, 即将跳转');
      setTimeout(() => {
        this.validAuthThanJump();
      }, 3000);
    });
  }

  isCommandSimulation = computed(() => this.selectedTab().includes('模拟'));

  async fetchTyphoonList() {
    try {
      const list = await this.api.extreme.getTyphoonList();
      this.actualTyphoonList = list;
      this.actualTyphoonOptions.set(list);

      this.state.update((state) => ({
        ...state,
        unitKey: '',
      }));

      // this.isCommandSimulation.set(!list.length);
    } catch (error) {
      this.message.error('获取台风信息失败');
      // this.isCommandSimulation.set(true);
    } finally {
      this.validated.set(true);
    }
  }
  backToPortal() {
    window.location.href = '/portal';
  }
}
