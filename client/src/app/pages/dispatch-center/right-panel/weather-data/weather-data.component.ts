import { Component, computed, input, output, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import dayjs, { Dayjs } from 'dayjs';
import { interval, map } from 'rxjs';
import { OccLandingService } from '../../../occ/map/landing.effect.service';
import { OccEventType } from '../../../occ/occ.event-bus.model';
import { OccEventBusService } from '../../../occ/occ.event-bus.service';
import { OccTyphoonService } from './../../../occ/map/typhoon.occ.service';
import { ModuleHeaderComponent } from './../../module-header/module-header.component';
import { ExtremeMarkersComponent } from './extreme-markers/extreme-markers.component';

const landingPlaceholder = '暂无预测数据';

@Component({
  selector: 'weather-data-module',
  imports: [ModuleHeaderComponent, ExtremeMarkersComponent],
  templateUrl: './weather-data.component.html',
  styleUrl: './weather-data.component.less',
})
export class WeatherDataComponent {
  large = input<boolean>(false);
  onToggleDetail = output<void>();

  typhoonLevel = signal('-');
  typhoonPower = signal('-');
  tendencyKeyword = signal('-');

  landingLocation = signal(landingPlaceholder);
  landingTime = signal(landingPlaceholder);

  updateTyphoonPosition$ = this.occEventBusService.on(
    OccEventType.UPDATE_TYPHOON_POSITION,
  );
  updateLandingInfo$ = this.occEventBusService.on(
    OccEventType.UPDATE_LANDING_INFO,
  );
  constructor(
    private occEventBusService: OccEventBusService,
    private landingService: OccLandingService,
    private occTyphoonService: OccTyphoonService,
  ) {
    this.updateTyphoonPosition$.subscribe((res) => {
      const { previousStates } = res;
      const lastState = previousStates[previousStates.length - 1];
      this.typhoonLevel.set(lastState.level + '级');
      this.typhoonPower.set(lastState.speed + 'm/s');
      this.landingLocation.set(lastState.info || landingPlaceholder);
      this.tendencyKeyword.set(
        this.landingService.getTendencyKeyword(lastState.tendency || ''),
      );
    });
    this.updateLandingInfo$.subscribe((res) => {
      this.updateLandingInfo();
    });
  }

  ngOnInit() {
    this.updateLandingInfo();
  }
  currentTime = toSignal(
    interval(1000).pipe(
      map(() => {
        return new Date();
        // if (this.occTyphoonService.isSimulation) {
        //   return this.occTyphoonService.simulateCurrentTime.toDate();
        // } else {
        //   return new Date();
        // }
      }),
    ),
  );

  timeText = computed(() => {
    const d = dayjs(this.currentTime());
    // 2024年12月18日 11:04:44
    return d.format('YYYY-MM-DD HH:mm') + ` ${this.getWeek(d)}`;
  });

  getWeek(day: Dayjs) {
    let data = day.day();
    let week = ['日', '一', '二', '三', '四', '五', '六'];
    return '星期' + week[data];
  }
  updateLandingInfo() {
    const predict = this.landingService.predict;
    if (!predict || !predict.landingState) {
      // this.landingLocation.set(landingPlaceholder);
      this.landingTime.set(landingPlaceholder);
      return;
    }
    // this.landingLocation.set(predict.landingState?.info || landingPlaceholder);
    const state = predict.landingState;
    this.landingTime.set(state.timeString || landingPlaceholder);
  }
}
