import { CommonModule } from '@angular/common';
import { Component, computed, input, signal } from '@angular/core';
import dayjs from 'dayjs';
import {
  horizontalInOut,
  horizontalInOutReverse,
} from '../../../common.animation';
import { ApiService } from '../../../services/api.service';
import { ITyphoonState } from '../../case-detail/services/meta';
import { UtilsService } from '../../case-detail/services/utils.service';
import {
  getWeatherColor,
  getWeatherType,
} from '../../dispatch-center/right-panel/weather-data/extreme-markers/utils';
import { OccTyphoonService } from '../../occ/map/typhoon.occ.service';

const weatherMarkerPrefix = 'assets/images/map/weather-alert/';

@Component({
  selector: 'supervisor-weather-record-overlay',
  imports: [CommonModule],
  templateUrl: './weather-record-overlay.component.html',
  styleUrl: './weather-record-overlay.component.less',
  animations: [horizontalInOut, horizontalInOutReverse],
})
export class WeatherRecordOverlayComponent {
  ds = input(false);

  visible = false;
  activeTabKey = signal('hazard');
  isTyphoonTabActive = computed(() => {
    return this.activeTabKey() === 'typhoon';
  });

  setActiveTabKey(key: string) {
    this.activeTabKey.set(key);
  }

  extremeWeathers = signal<Extreme.WeatherDto[]>([
    // {
    //   forecaster: 'smc',
    //   publishtime: '2025-7-16 9:10:00',
    //   title: 'Z_SEVP_C_BCSH_20250716091000_W_YJXH-2025171',
    //   alertname: '高温',
    //   warningstate: '发布',
    //   preupdatelevel: '橙色',
    //   alertlevel: '橙色',
    //   info: '上海中心气象台2025年07月16日09时10分发布高温橙色预警信号：预计今天本市大部地区的最高气温将超过37℃，请注意防范强高温对工农业生产、人体健康的不利影响，确保生产、消防、用电等方面的安全。',
    //   defenseguideline:
    //     '1、外出时做好防暑防晒，缩短高温时段的户外活动时间。2、对农作物、绿植、花卉等采取防高温热害措施。',
    //   publishtimes: '2025年07月16日 09:10:00',
    //   alertnames: 'gaowen',
    //   alertlevels: 'chengse',
    //   isEnd: 1,
    //   endtime: '2025-07-16T08:46:32.531Z',
    // },
  ]);

  composeHazards = computed(() => {
    return this.extremeWeathers().map((r) => {
      const type = getWeatherType(r.alertname);
      const degree = getWeatherColor(r.alertlevel);
      const text = `${r.alertname}${r.alertlevel}预警`;
      return {
        ...r,
        extract: {
          type,
          degree,
          text,
          src: weatherMarkerPrefix + type + '-' + degree + '.png',
          title: dayjs(r.publishtime).format(
            '上海中心气象台YYYY年MM月DD日HH时mm分发布',
          ),
          avertTime: r.isEnd ? dayjs(r.endtime).format('YYYY/MM/DD HH:mm') : '',
        },
      };
    });
  });

  stateData = signal<ITyphoonState[]>([]);
  simplifiedStateData = computed(() => {
    return this.stateData().map((s) => {
      return {
        time: dayjs(s.time).format('MM月DD日HH时'),
        position: `${s.lat}/ ${s.lon}`,
        speed: s.speed + 'm/s',
        centerPressure: s.centerPressure + '百帕',
        level: `${s.level}级-${s.strong}`,
      };
    });
  });
  paddingRows = computed(() => {
    const rows = this.stateData();
    const offset = 9 - rows.length;
    if (offset <= 0) return [];
    return Array.from({ length: offset }, () => ({
      content: '',
    }));
  });

  constructor(
    private typhoonService: OccTyphoonService,
    private utils: UtilsService,
    private api: ApiService,
  ) {}
  async fetchWeatherRecord() {
    const data = await this.api.extreme.getWeatherRecord();
    this.extremeWeathers.set(data);
  }
  ngAfterViewInit() {
    this.updateWeatherRecord();
  }

  updateWeatherRecord() {
    if (this.typhoonService.isSimulation) {
      this.setWeatherWeatherFromHistory();
      return;
    }
    this.fetchWeatherRecord();
  }
  setWeatherWeatherFromHistory() {
    if (!this.typhoonService.isSimulation) {
      this.extremeWeathers.set([]);
      return;
    }
    const weatherActions = this.utils.weatherEvents;
    const ws = weatherActions
      .filter((w) => {
        return (
          new Date(w.fromDate) <=
          this.typhoonService.simulateCurrentTime.toDate()
        );
      })
      .map((w) => {
        const convertedPublishTime = this.typhoonService.convertToSimulateTime(
          new Date(w.fromDate),
        );
        return {
          forecaster: 'smc',
          publishtime: convertedPublishTime.toISOString(),
          title: '',
          alertname: w.items['类型'],
          warningstate: '发布',
          preupdatelevel: w.items['等级'],
          alertlevel: w.items['等级'],
          info: '',
          defenseguideline: '',
          publishtimes: convertedPublishTime.format('YYYY年MM月DD日 HH:mm'),
          alertnames: '',
          alertlevels: '',
          isEnd: 0,
          endtime: '',
        };
      })
      .reverse();
    this.extremeWeathers.set(ws);
  }
  setStateData() {
    const current = this.typhoonService.getCurrentTyphoonFrame();
    if (current) {
      let frames = current.previousStates.slice().reverse();
      if (this.typhoonService.isSimulation) {
        frames = frames.map((f) => ({
          ...f,
          time: this.typhoonService.convertToSimulateTime(f.time).toDate(),
        }));
      }
      this.stateData.set(frames);
    } else {
      this.stateData.set([]);
    }
  }

  toggleVisible() {
    this.visible = !this.visible;
    if (this.visible) {
      this.updateWeatherRecord();
      this.setStateData();
    }
  }
  setVisible(visible: boolean) {
    this.visible = visible;
    this.updateWeatherRecord();
    this.setStateData();
  }
  close() {
    this.visible = false;
  }
}
