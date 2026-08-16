import { Component } from '@angular/core';

@Component({
  selector: 'digital-preplan-config',
  imports: [],
  templateUrl: './config.component.html',
  styleUrl: './config.component.less',
})
export class ConfigComponent {
  durations = [5, 8, 10];
  activeDuration = 8;

  setDuration(duration: number) {
    this.activeDuration = duration;
  }
  getImage(index: number) {
    return `assets/images/typhoon-library/digital-preplan/config/config-image-${index}-${this.activeDuration}.svg`;
  }
}
