import { Injectable, signal } from '@angular/core';
import dayjs from 'dayjs';
import { Subject } from 'rxjs';
import { ApiService } from '../../../services/api.service';
import {
  getWeatherColor,
  getWeatherType,
  IWeatherMarker,
} from '../../dispatch-center/right-panel/weather-data/extreme-markers/utils';
import { OccTyphoonService } from './typhoon.occ.service';

const weatherMarkerPrefix = 'assets/images/map/weather-alert/';

@Injectable({
  providedIn: 'root',
})
export class OccWeatherService {
  allMarkers = signal<IWeatherMarker[]>([]);
  publishTime = signal<string>('-');

  fetchSubject$ = new Subject<void>();

  constructor(
    private api: ApiService,
    private typhoonService: OccTyphoonService,
  ) {}

  async updateWeather() {
    const isSimulation = this.typhoonService.isSimulation;
    if (isSimulation) {
      await this.updateSimulateWeather();
      return;
    }
    await this.fetchWeather();
  }
  async updateSimulateWeather() {
    const markers = await this.typhoonService.getCurrentSimulateWeather();
    this.allMarkers.set(markers);

    if (markers.length) {
      const publishTimes = markers.slice().sort((a, b) => {
        return (
          new Date(a.publishTime).getTime() - new Date(b.publishTime).getTime()
        );
      });
      const closest = publishTimes[publishTimes.length - 1]?.publishTime;
      if (!closest) {
        this.publishTime.set('');
      } else {
        this.publishTime.set(
          dayjs(
            this.typhoonService.convertToSimulateTime(new Date(closest)),
          ).format('YYYY-MM-DD HH:mm'),
        );
      }
    } else {
      this.publishTime.set('');
    }
    this.fetchSubject$.next();
  }
  async fetchWeather() {
    const result = await this.api.extreme.getExtremeWeather();

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
          'YYYY-MM-DD HH:mm',
        ),
      );
    } else {
      this.publishTime.set('-');
    }
    this.fetchSubject$.next();
  }
}
