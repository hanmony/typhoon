import { Component } from '@angular/core';
import { DutySpotComponent } from './../../dispatch-center/right-panel/duty-spot/duty-spot.component';
import { WeatherDataComponent } from './../../dispatch-center/right-panel/weather-data/weather-data.component';
import { EventDataModuleComponent } from './event-data-module/event-data-module.component';
import { LineDataModuleComponent } from './line-data-module/line-data-module.component';
import { LineOpModuleComponent } from './line-op-module/line-op-module.component';

@Component({
  selector: 'cocc-right-screen',
  imports: [
    WeatherDataComponent,
    DutySpotComponent,
    LineOpModuleComponent,
    EventDataModuleComponent,
    LineDataModuleComponent,
  ],
  templateUrl: './right-screen.component.html',
  styleUrl: './right-screen.component.less',
})
export class CoccRightScreenComponent {}
