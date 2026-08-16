import {
  Component,
  ElementRef,
  Input,
  SimpleChanges,
  ViewChild,
} from '@angular/core';
import { horizontalInOut } from '../../../../common.animation';
import {
  AutoPlayService,
  AutoPlayState,
} from '../../services/auto-play.service';
import { ITyphoonData, ITyphoonState } from '../../services/meta';
import { UtilsService } from '../../services/utils.service';
import { Timing } from '../../timeline/timeline.component';
import { LibraryNzModule } from './../../../../library.nz.module';

interface ColumnItem<T = any> {
  key: keyof ITyphoonState;
  name: string;
  align?: 'left' | 'right' | 'center';
  width?: number;
  formatter?: (value: T) => string;
}

@Component({
  selector: 'typhoon-detail-modal',
  imports: [LibraryNzModule],
  animations: [horizontalInOut],
  templateUrl: './typhoon-detail-modal.component.html',
  styleUrl: './typhoon-detail-modal.component.less',
})
export class TyphoonDetailModalComponent {
  @ViewChild('tableBody') tableBody!: ElementRef<HTMLBodyElement>;

  visible = false;
  @Input() typhoonMeta?: ITyphoonData = {
    name: '',
    year: 2022,
    states: [],
  };
  @Input() selectedTiming?: Timing;
  autoPlaying = false;
  autoPlayTime = '';

  activeState?: ITyphoonState;
  activeIndex: number = -1;
  composeCircleTexts: string[] = [];
  composeWeather: string = '';
  landText: string = '';

  columns: ColumnItem[] = [
    {
      key: 'time',
      name: '时间',
      formatter: (value: Date) => {
        if (!value) return '';
        return `${
          value.getMonth() + 1
        }月${value.getDate()}日${value.getHours()}时`;
      },
      // formatter: (value: Date) => {
      //   return '12月28日23时';
      // },
    },
    { key: 'lon', name: '东经', align: 'center', width: 56 },
    { key: 'lat', name: '北纬', align: 'center', width: 56 },
    { key: 'speed', name: '风速', align: 'center', width: 50 },
    { key: 'level', name: '级别', align: 'center', width: 50 },
    { key: 'centerPressure', name: '中心气压', align: 'center', width: 85 },
  ];
  get currentTimeString() {
    if (!this.selectedTiming && !this.autoPlaying) return '';
    if (this.autoPlaying) {
      return this.autoPlayTime || '';
    } else {
      return this.selectedTiming?.startTime || '';
    }
  }
  constructor(
    private readonly autoPlayService: AutoPlayService,
    private readonly utils: UtilsService,
  ) {
    this.autoPlayService.autoPlayStateChangeSubject$.subscribe((state) => {
      if (state === AutoPlayState.RUNNING) {
        this.autoPlaying = true;
      } else if (state === AutoPlayState.TERMINATED) {
        this.autoPlaying = false;
      }
    });
    this.autoPlayService.autoPlayTaskChangeSubject$.subscribe((task) => {
      if (task) {
        this.autoPlayTime = task.startTime;
      }
    });
  }
  ngOnChanges(changes: SimpleChanges) {
    if (changes['typhoonMeta']) {
      this.activeIndex = -1;
      this.activeState = undefined;
      this.setComposeTexts();
      this.setLandText();
    }
  }
  onRowClick(idx: number) {
    this.setActiveIndex(idx);
  }
  setActiveIndex(idx: number) {
    this.activeState = this.typhoonMeta?.states[idx];
    this.activeIndex = idx;
    this.setComposeTexts();
  }
  setActiveStateByTime() {
    const idx = this.getClosestStateIndexByTime();
    this.setActiveIndex(idx);
    if (idx !== -1) {
      setTimeout(() => {
        this.setStateIntoView();
      });
    }
  }
  getClosestStateIndexByTime(): number {
    if (!this.typhoonMeta) return -1;
    const t = this.currentTimeString;
    let idx = -1;
    let minDiff = Infinity;
    this.typhoonMeta.states.forEach((state, i) => {
      const diff = Math.abs(new Date(t).getTime() - state.time.getTime());
      if (diff < minDiff) {
        minDiff = diff;
        idx = i;
      }
    });
    return idx;
  }
  setComposeTexts() {
    if (!this.activeState) {
      this.composeCircleTexts = [];
      this.composeWeather = '';
      return;
    }
    const { time, radiusText } = this.activeState;
    this.composeCircleTexts = radiusText.split('  ').filter((t) => !!t);
    const weatherEvents = this.utils.getWeatherEventsWithCertainTime(
      this.utils.formatTimeString(time),
    );
    if (weatherEvents && weatherEvents.length > 0) {
      const text = weatherEvents
        .map((e) => e.items['等级'] + e.items['类型'])
        .join('， ');
      this.composeWeather = text || '';
    } else {
      this.composeWeather = '';
    }
  }
  setLandText() {
    const infos = this.typhoonMeta?.states.map((e) => e.info) || [];
    for (const info of infos) {
      if (info && info.indexOf('上海') !== -1) {
        this.landText = info;
        return;
      }
    }
  }
  toggleVisible() {
    this.visible = !this.visible;
    if (this.visible) {
      this.setActiveStateByTime();
    }
  }
  close() {
    this.visible = false;
  }
  setStateIntoView() {
    if (!this.activeState) return;
    if (!this.tableBody?.nativeElement) return;
    const dom = this.tableBody.nativeElement;
    const row = dom.querySelector(
      `tr[data-index="${this.activeIndex}"]`,
    ) as HTMLElement;
    if (row) {
      row.scrollIntoView({
        behavior: 'smooth',
        block: 'center',
      });
    }
  }
}
