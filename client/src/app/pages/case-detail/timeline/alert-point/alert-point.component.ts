import { Component, Input } from '@angular/core';
import { weatherIconArray } from '../../../../../scripts/weatherIconArray';
import { ActionDto } from '../../../../domain/action.dto';
import { LibraryNzModule } from '../../../../library.nz.module';
import { UtilsService } from '../../services/utils.service';

@Component({
  selector: 'alert-point',
  imports: [LibraryNzModule],
  templateUrl: './alert-point.component.html',
  styleUrl: './alert-point.component.less',
  host: {
    class: '2xl:w-[60px] w-14',
  },
})
export class AlertPointComponent {
  @Input() type: string = 'typhoon-blue';
  @Input() ev!: ActionDto;
  @Input() active: boolean = false;
  @Input() blink: boolean = false;
  @Input() disabled: boolean = false;
  @Input() ban: boolean = false;
  @Input() sliceLeft: boolean = false;
  @Input() sliceRight: boolean = false;
  constructor(private readonly utils: UtilsService) {}
  get icon() {
    if (this.disabled) {
      return this.disabledIcon;
    }
    if (this.active) {
      return this.activeIcon;
    }
    return this.defaultIcon;
  }
  get weatherTypeText() {
    return this.ev.items['类型'];
  }
  get hasSpecialIcon() {
    // return ['台风', '暴雨'].includes(this.weatherTypeText);
    // return this.weatherTypeText !== 'unknown';
    return weatherIconArray.includes(this.type);
  }
  srcForBg(s: string) {
    return `url(assets/images/map/timeline/weather-icon/${s}.png)`;
  }
  get disabledIcon() {
    return this.srcForBg('disable-alert');
  }
  get subType() {
    return this.utils.getWeatherAlertType(this.ev);
  }
  get degree() {
    return this.utils.getWeatherColor(this.ev);
  }
  get activeIcon() {
    if (this.hasSpecialIcon) {
      return this.srcForBg(`${this.type}-active`);
    }
    return this.srcForBg(`${this.degree}-alert-active`);
  }
  get defaultIcon() {
    if (this.hasSpecialIcon) {
      return this.srcForBg(this.type);
    }
    return this.srcForBg(`${this.degree}-alert`);
  }
}
