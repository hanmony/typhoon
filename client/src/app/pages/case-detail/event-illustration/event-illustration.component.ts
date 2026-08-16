import { Component, EventEmitter, Output } from '@angular/core';
import {
  horizontalInOut,
  verticalInOutRelative,
} from '../../../common.animation';
import { ActionCategory } from '../../../domain/action.category';
import { LibraryNzModule } from '../../../library.nz.module';
import { AutoPlayService, AutoPlayState } from '../services/auto-play.service';

export type SymbolTip = {
  symbol: string;
  subType: string;
  category: ActionCategory;
};
@Component({
  selector: 'event-illustration',
  imports: [LibraryNzModule],
  templateUrl: './event-illustration.component.html',
  styleUrl: './event-illustration.component.less',
  animations: [horizontalInOut, verticalInOutRelative],
})
export class EventIllustrationComponent {
  weatherAlerts: string[] = [];
  pendingWeatherAlerts: string[] = [];
  clickable = true;
  pendingSymbolTips: SymbolTip[] = [];
  symbolTips: SymbolTip[] = [];
  batchUpdateTimer: NodeJS.Timeout | null = null;

  @Output() symbolClickHandler: EventEmitter<SymbolTip> = new EventEmitter();

  constructor(private readonly autoPlayService: AutoPlayService) {
    this.autoPlayService.autoPlayStateChangeSubject$.subscribe((state) => {
      if (
        state === AutoPlayState.TERMINATED ||
        state === AutoPlayState.INITIALIZED
      ) {
        this.clickable = true;
      } else {
        this.clickable = false;
      }
    });
  }
  showWeatherAlerts(weatherAlertStrings: string[]) {
    const als = this.getFinalWeatherAlertStrings(weatherAlertStrings);
    this.pendingWeatherAlerts = als;
    this.animationUpdateWeatherAlerts();
  }
  getFinalWeatherAlertStrings(weatherAlertStrings: string[]) {
    if (!weatherAlertStrings || weatherAlertStrings.length === 0) {
      return [];
    }
    const validWeatherAlertStrings = weatherAlertStrings.filter((s) =>
      this.isValidWeatherAlertString(s),
    );
    return this.filteredWeatherAlertStringsBySubTypeIfLift(
      validWeatherAlertStrings,
    );
  }
  isValidWeatherAlertString(s: string) {
    if (!s) return false;
    const validRegex = /^(.+)-(.+)$/;
    const matched = s.match(validRegex);
    if (!matched) return false;
    const [, subType, degree] = matched;
    if (subType === 'unknown' || degree === 'unknown') {
      return false;
    }
    return true;
  }
  filteredWeatherAlertStringsBySubTypeIfLift(weatherAlertStrings: string[]) {
    // 同类型去重，以及解除预警后过滤该类型
    const subTypeMap = new Map<string, string>();
    weatherAlertStrings.forEach((str) => {
      const validRegex = /^(.+)-(.+)$/;
      const matched = str.match(validRegex);
      if (!matched) return;
      const [, subType, degree] = matched;
      subTypeMap.set(subType, degree);
    });
    return Array.from(subTypeMap).map(([subType, degree]) => {
      return `${subType}-${degree}`;
    });
  }
  getWeatherAlertImage(weatherAlertString) {
    return `assets/images/map/weather-alert/${weatherAlertString}.png`;
  }
  onSymbolClick(st: SymbolTip) {
    if (!this.clickable) return;
    this.symbolClickHandler.emit(st);
  }
  clearWeatherAlerts() {
    this.pendingWeatherAlerts = [];
    this.weatherAlerts = [];
  }
  clearSymbolTips() {
    this.pendingSymbolTips = [];
    this.symbolTips = [];
  }
  removeSymbolTip(subType: string) {
    this.pendingSymbolTips = this.pendingSymbolTips.filter(
      (e) => e.subType !== subType,
    );
    this.batchUpdate();
  }
  addSymbolTip(symbol: string, subType: string, category: ActionCategory) {
    if (this.pendingSymbolTips.find((e) => e.subType === subType)) {
      return;
    }
    this.pendingSymbolTips.push({
      symbol,
      subType,
      category,
    });
    this.batchUpdate();
  }
  batchUpdate() {
    if (this.batchUpdateTimer) clearTimeout(this.batchUpdateTimer);
    this.batchUpdateTimer = setTimeout(() => {
      this.updateViewByOrder();
      this.batchUpdateTimer = null;
    }, 100);
  }
  updateViewByOrder() {
    this.symbolTips = this.symbolTips.filter((s) =>
      this.pendingSymbolTips.find((p) => p.symbol === s.symbol),
    );
    setTimeout(() => {
      for (const pendingSymbolTip of this.pendingSymbolTips) {
        if (
          !this.symbolTips.find((s) => s.symbol === pendingSymbolTip.symbol)
        ) {
          this.symbolTips.push(pendingSymbolTip);
        }
      }
    }, 500);
  }
  animationUpdateWeatherAlerts() {
    this.weatherAlerts = this.weatherAlerts.filter((s) => {
      return this.pendingWeatherAlerts.includes(s);
    });
    setTimeout(() => {
      // this.weatherAlerts = this.pendingWeatherAlerts;
      this.pendingWeatherAlerts.forEach((w) => {
        if (!this.weatherAlerts.includes(w)) {
          this.weatherAlerts.unshift(w);
        }
      });
    }, 500);
  }
  autoPlayClearMap() {
    this.clearSymbolTips();
    this.clearWeatherAlerts();
  }
}
