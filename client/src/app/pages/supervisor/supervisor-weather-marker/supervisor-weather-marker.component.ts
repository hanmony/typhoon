import { CommonModule } from '@angular/common';
import { Component, signal } from '@angular/core';
import { interval, Subscription } from 'rxjs';
import { CommandService } from '../../occ/map/command.service';
import { OccWeatherService } from '../../occ/map/weather.occ.service';

@Component({
  selector: 'supervisor-weather-marker',
  imports: [CommonModule],
  templateUrl: './supervisor-weather-marker.component.html',
  styleUrl: './supervisor-weather-marker.component.less',
})
export class SupervisorWeatherMarkerComponent {
  fetchInterval$ = interval(60000);
  fetchIntervalSubscription$?: Subscription;

  allMarkers = this.weatherService.allMarkers().slice();

  constructor(
    private commandService: CommandService,
    private weatherService: OccWeatherService,
  ) {
    this.fetchIntervalSubscription$ = this.fetchInterval$.subscribe(() => {
      this.weatherService.updateWeather();
    });
    this.commandService.commandSetupSubject$.subscribe(() => {
      this.weatherService.updateWeather();
    });
    this.weatherService.fetchSubject$.subscribe(() => {
      this.allMarkers = this.weatherService.allMarkers().slice();
    });
  }
  currentIndex = signal(0);

  ngAfterViewInit() {
    this.weatherService.updateWeather();
  }

  ngOnDestroy() {
    this.fetchIntervalSubscription$?.unsubscribe();
  }
}
