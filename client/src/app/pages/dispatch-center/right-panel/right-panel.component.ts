import { Component, input, output, signal, ViewChild } from '@angular/core';
import { WeatherRecordOverlayComponent } from '../../supervisor/weather-record-overlay/weather-record-overlay.component';
import { EventNotificationComponent } from './event-notification/event-notification.component';
import { WeatherDataComponent } from './weather-data/weather-data.component';

@Component({
  selector: 'dispatch-right-panel',
  imports: [
    // DutySpotComponent,
    WeatherDataComponent,
    EventNotificationComponent,
    // UrgentTeamComponent,
    // EmergencyTeamComponent,
    // StayTunedComponent,
    // IntelligentToolComponent,
    // RealTimeCloseComponent,
    // UrgentTeamComponent,
    WeatherRecordOverlayComponent,
  ],
  templateUrl: './right-panel.component.html',
  styleUrl: './right-panel.component.less',
})
export class DispatchRightPanelComponent {
  @ViewChild(WeatherRecordOverlayComponent)
  weatherRecordOverlayRef?: WeatherRecordOverlayComponent;
  events = input<ExtremeOcc.Event[]>([]);
  operations = input<ExtremeOcc.Operation[]>([]);
  locateEvent = output<ExtremeOcc.Event>();
  toggleSimulatedPatrolling = output<void>();

  weatherDataOverlayVisible = signal(false);

  toggleWeatherDataOverlayVisible() {
    this.weatherDataOverlayVisible.set(!this.weatherDataOverlayVisible());
    this.weatherRecordOverlayRef?.toggleVisible();
  }
}
