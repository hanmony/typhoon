import { Component, Input, ViewChild } from '@angular/core';
import { ActionCategory } from '../../../domain/action.category';
import { ActionDto } from '../../../domain/action.dto';
import { CaseDto } from '../../../domain/case.dto';
import { Typhoon } from '../services/classes/typhoon.class';
import { ITyphoonData } from '../services/meta';
import { globalEventCategories } from '../services/utils.service';
import { AnimationNumberComponent } from './animation-number/animation-number.component';
import { EventTabsComponent } from './event-tabs/event-tabs.component';
import { ThumbnailComponent } from './thumbnail/thumbnail.component';

const mapping: Partial<
  Record<ActionCategory, 'alert' | 'directive' | 'propaganda' | 'report'>
> = {
  [ActionCategory.alert]: 'alert',
  [ActionCategory.directive]: 'directive',
  [ActionCategory.propaganda]: 'propaganda',
  [ActionCategory.report]: 'report',
};
@Component({
  selector: 'case-detail-panel',
  imports: [EventTabsComponent, AnimationNumberComponent, ThumbnailComponent],
  templateUrl: './panel.component.html',
  styleUrl: './panel.component.less',
})
export class PanelComponent {
  @Input() data!: CaseDto;
  @Input() typhoonMeta?: ITyphoonData;
  @Input() typhoonModel?: Typhoon;
  @ViewChild(EventTabsComponent) eventTabsRef?: EventTabsComponent;

  globalEventCount = {
    alert: 0,
    directive: 0,
    propaganda: 0,
    report: 0,
  };
  zoom = 1;
  ngAfterViewInit() {
    if (this.eventTabsRef?.tabsRef) {
      const tcDom = this.eventTabsRef?.tabsRef.nativeElement;
      const { width } = tcDom.getBoundingClientRect();
      setTimeout(() => {
        this.zoom = Math.round(width) / 500;
      });
    }
  }

  formatNumber(numberStr?: string) {
    if (!numberStr) return 0;
    return parseInt(numberStr, 10) || 0;
  }
  pushEvent(ev: ActionDto) {
    if (this.eventTabsRef) {
      this.eventTabsRef.pushEvent(ev);
    }
  }
  autoPlayPushEvent(ev: ActionDto) {
    if (globalEventCategories.includes(ev.category)) {
      const key = mapping[ev.category]!;
      this.globalEventCount[key]++;
    }
    if (this.eventTabsRef) {
      this.eventTabsRef.pushEvent(ev, true);
    }
  }
  clearEvents() {
    if (this.eventTabsRef) {
      this.eventTabsRef.clearEvents();
    }
    this.globalEventCount = {
      alert: 0,
      directive: 0,
      propaganda: 0,
      report: 0,
    };
  }
  getValue(data: CaseDto, key: string) {
    return data.values[key]?.value || '-';
  }
}
