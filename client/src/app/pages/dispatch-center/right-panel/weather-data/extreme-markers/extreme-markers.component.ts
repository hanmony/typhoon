import { CommonModule } from '@angular/common';
import {
  Component,
  computed,
  ElementRef,
  output,
  signal,
  ViewChild,
} from '@angular/core';
import dayjs from 'dayjs';
import { interval, Subscription } from 'rxjs';
import { ApiService } from '../../../../../services/api.service';
import { OccTyphoonService } from '../../../../occ/map/typhoon.occ.service';
import {
  getWeatherColor,
  getWeatherType,
  IWeatherMarker,
  separateBy4,
} from './utils';

const weatherMarkerPrefix = 'assets/images/map/weather-alert/';

// cold-blue.png

/**
 * 天气预警优先级，优先按等级排序。同级别按类型排序
 * 红＞橙＞黄＞蓝
 * 台风＞暴雨＞大风＞暴雪＞道路结冰＞冰雹＞霜冻＞雷电＞大雾＞寒潮＞低温＞高温＞霾
 */

@Component({
  selector: 'ds-extreme-markers',
  imports: [CommonModule],
  standalone: true,
  templateUrl: './extreme-markers.component.html',
  styleUrl: './extreme-markers.component.less',
})
export class ExtremeMarkersComponent {
  @ViewChild('markersWrapper') markersWrapper?: ElementRef<HTMLDivElement>;
  onToggleDetail = output<void>();

  interval$ = interval(5000);
  intervalSubscription$?: Subscription;

  fetchInterval$ = interval(60000);
  updateIntervalSubscription$?: Subscription;

  wrapperWidth = signal(221.6);

  publishTime = signal('00:00');
  allMarkers = signal<IWeatherMarker[]>([
    //   {
    //     type: '暴雨蓝色预警',
    //     degree: 'blue',
    //     src: weatherMarkerPrefix + 'rain-blue.png',
    //   },
  ]);

  separatedMarkers = computed(() => {
    return separateBy4(this.allMarkers());
  });

  constructor(
    private api: ApiService,
    private occTyphoonService: OccTyphoonService,
  ) {
    this.intervalSubscription$ = this.interval$.subscribe(() => {
      this.intervalScrollHandler();
    });
    this.updateIntervalSubscription$ = this.fetchInterval$.subscribe(() => {
      this.updateWeather();
    });
  }
  currentIndex = signal(0);

  ngAfterViewInit() {
    this.setWrapperWidth();
    setTimeout(() => {
      this.updateWeather();
    }, 2000);
  }

  intervalScrollHandler() {
    if (this.allMarkers().length > 4) {
      this.scrollToNextPage();
    }
  }

  scrollToNextPage() {
    const current = this.currentIndex();
    const next = current + 1;
    if (next < this.separatedMarkers().length) {
      this.currentIndex.set(next);
    } else {
      this.currentIndex.set(0);
    }
    this.domScroll();
  }

  domScroll() {
    const dom = this.markersWrapper?.nativeElement;
    if (dom) {
      dom.scrollTo({
        left: this.currentIndex() * this.wrapperWidth(),
        behavior: 'smooth',
      });
    }
  }

  setWrapperWidth() {
    if (this.markersWrapper) {
      this.wrapperWidth.set(this.markersWrapper.nativeElement.offsetWidth);
    }
  }

  async updateWeather() {
    const isSimulation = this.occTyphoonService.isSimulation;
    if (isSimulation) {
      const markers = await this.occTyphoonService.getCurrentSimulateWeather();
      this.allMarkers.set(markers);

      if (markers.length) {
        const publishTimes = markers.slice().sort((a, b) => {
          return (
            new Date(a.publishTime).getTime() -
            new Date(b.publishTime).getTime()
          );
        });
        const closest = publishTimes[publishTimes.length - 1].publishTime;
        this.publishTime.set(
          dayjs(
            this.occTyphoonService.convertToSimulateTime(new Date(closest)),
          ).format('HH:mm'),
        );
      } else {
        this.publishTime.set('');
      }
      return;
    }
    this.fetchWeather();
  }

  async fetchWeather() {
    const result = await this.api.extreme.getExtremeWeather();
    // const dummy = [
    //   {
    //     forecaster: 'smc',
    //     publishtime: '2025-6-10 4:30:00',
    //     title: 'Z_SEVP_C_BCSH_20250610043000_W_YJXH-2025094',
    //     alertname: '雷电',
    //     warningstate: '发布',
    //     preupdatelevel: '黄色',
    //     alertlevel: '黄色',
    //     info: '上海中心气象台2025年06月10日04时30分发布雷电黄色预警信号：预计未来24小时内本市将发生雷电活动，并伴有最大一小时雨量20-30毫米的短时强降水，可能会造成雷电灾害事故，请注意防范。',
    //     defenseguideline:
    //       '1、远离大树、墙角或有突出金属物的地方；不要在户外将金属物品朝天握在手中或扛在肩上。',
    //     publishtimes: '2025年06月10日 04:30:00',
    //     alertnames: 'leidian',
    //     alertlevels: 'huangse',
    //   },
    //   {
    //     forecaster: 'smc',
    //     publishtime: '2025-6-10 2:30:00',
    //     title: 'Z_SEVP_C_BCSH_20250610043000_W_YJXH-2025094',
    //     alertname: '台风',
    //     warningstate: '发布',
    //     preupdatelevel: '黄色',
    //     alertlevel: '黄色',
    //     info: '上海中心气象台2025年06月10日04时30分发布雷电黄色预警信号：预计未来24小时内本市将发生雷电活动，并伴有最大一小时雨量20-30毫米的短时强降水，可能会造成雷电灾害事故，请注意防范。',
    //     defenseguideline:
    //       '1、远离大树、墙角或有突出金属物的地方；不要在户外将金属物品朝天握在手中或扛在肩上。',
    //     publishtimes: '2025年06月10日 04:30:00',
    //     alertnames: 'leidian',
    //     alertlevels: 'huangse',
    //   },
    // ];
    this.allMarkers.set(
      result.map((r) => {
        const type = getWeatherType(r.alertname);
        const degree = getWeatherColor(r.alertlevel);
        return {
          type,
          degree,
          src: weatherMarkerPrefix + type + '-' + degree + '.png',
        };
      }),
    );
    if (result.length) {
      const publishTimes = result.slice().sort((a, b) => {
        return (
          new Date(a.publishtime).getTime() - new Date(b.publishtime).getTime()
        );
      });
      this.publishTime.set(
        dayjs(publishTimes[publishTimes.length - 1].publishtime).format(
          'HH:mm',
        ),
      );
    } else {
      this.publishTime.set('');
    }
  }

  ngOnDestroy() {
    this.intervalSubscription$?.unsubscribe();
    this.updateIntervalSubscription$?.unsubscribe();
  }
}
