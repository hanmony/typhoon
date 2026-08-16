import { Component, input, output } from '@angular/core';
import { weatherIconArray } from '../../../../../../scripts/weatherIconArray';
import { ComparePoint } from '../../typhoon.compare.service';

@Component({
  selector: 'compare-timeline-point',
  imports: [],
  templateUrl: './point.component.html',
  styleUrl: './point.component.less',
})
export class PointComponent {
  data = input.required<ComparePoint>();
  active = input(false);
  onSelect = output<ComparePoint>();
  get icon() {
    if (this.active()) {
      return this.activeIcon;
    }
    return this.defaultIcon;
  }
  srcForBg(s: string) {
    return `url(assets/images/map/timeline/weather-icon/${s}.png)`;
  }
  get type() {
    return this.data().type;
  }
  get degree() {
    return this.data().degree;
  }
  get rawIcon() {
    return this.data().icon;
  }
  get disabledIcon() {
    return this.srcForBg('disable-alert');
  }
  get hasSpecialIcon() {
    // return ['台风', '暴雨'].includes(this.weatherTypeText);
    // return this.weatherTypeText !== 'unknown';
    return weatherIconArray.includes(this.rawIcon);
  }
  get activeIcon() {
    if (this.hasSpecialIcon) {
      return this.srcForBg(`${this.rawIcon}-active`);
    }
    return this.srcForBg(`${this.degree}-alert-active`);
  }

  get defaultIcon() {
    if (this.hasSpecialIcon) {
      return this.srcForBg(this.rawIcon);
    }
    return this.srcForBg(`${this.degree}-alert`);
  }
}
