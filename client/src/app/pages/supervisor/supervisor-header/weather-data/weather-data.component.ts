import { Component, signal } from '@angular/core';
import dayjs from 'dayjs';
import { NzToolTipModule } from 'ng-zorro-antd/tooltip';
import { OccLandingService } from '../../../occ/map/landing.effect.service';
import { OccWeatherService } from '../../../occ/map/weather.occ.service';
import { OccEventType } from '../../../occ/occ.event-bus.model';
import { OccEventBusService } from '../../../occ/occ.event-bus.service';

const landingPlaceholder = '暂无预测数据';

@Component({
  selector: 'supervisor-weather-data',
  imports: [NzToolTipModule],
  templateUrl: './weather-data.component.html',
  styleUrl: './weather-data.component.less',
})
export class WeatherDataComponent {
  typhoonType = signal('-');
  typhoonLevel = signal('-');
  typhoonPower = signal('-');
  tendencyKeyword = signal('-');
  landingLocation = signal(landingPlaceholder);
  weatherPublishTime = signal('-');

  updateTyphoonPosition$ = this.occEventBusService.on(
    OccEventType.UPDATE_TYPHOON_POSITION,
  );
  updateLandingInfo$ = this.occEventBusService.on(
    OccEventType.UPDATE_LANDING_INFO,
  );
  constructor(
    private occEventBusService: OccEventBusService,
    private landingService: OccLandingService,
    private weatherService: OccWeatherService,
  ) {
    this.updateTyphoonPosition$.subscribe((res) => {
      const { previousStates } = res;
      const lastState = previousStates[previousStates.length - 1];
      this.typhoonType.set(lastState.strong || '-');
      this.typhoonLevel.set(lastState.level + '级');
      this.typhoonPower.set(lastState.speed + 'm/s');
      this.tendencyKeyword.set(
        this.landingService.getTendencyKeyword(lastState.tendency || ''),
      );
      this.landingLocation.set(lastState.info || landingPlaceholder);
    });

    this.weatherService.fetchSubject$.subscribe(() => {
      const t = this.weatherService.publishTime();
      this.weatherPublishTime.set(
        !t || t === '-' ? '-' : dayjs(t).format('MM-DD HH:mm'),
      );
    });
  }

  ngOnInit() {}
}
