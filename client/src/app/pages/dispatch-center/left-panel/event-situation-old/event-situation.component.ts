import { Component, computed, input, output } from '@angular/core';
import dayjs from 'dayjs';
import { EventListPopupDirective } from '../../event-list-popup.directive';
import { ModuleHeaderComponent } from './../../module-header/module-header.component';

@Component({
  selector: 'event-situation-module',
  imports: [ModuleHeaderComponent, EventListPopupDirective],
  templateUrl: './event-situation.component.html',
  styleUrl: './event-situation.component.less',
})
export class EventSituationComponent {
  events = input<ExtremeOcc.Event[]>([]);
  locateEvent = output<ExtremeOcc.Event>();

  visibleEvents = computed(() => {
    return this.events().filter((ev) => !!ev.isShow);
  });
  todayTotal = computed(() => {
    return this.visibleEvents().filter((ev) => {
      return dayjs(ev.createTime).isSame(dayjs(), 'day');
    });
  });
  floodControlEvent = computed(() => {
    return this.visibleEvents().filter((ev) =>
      ['积水', '渗漏水'].includes(ev.eventType),
    );
  });
  typhoonEvent = computed(() => {
    return this.visibleEvents().filter((ev) =>
      ['树枝侵限', '异物侵限', '设备故障'].includes(ev.eventType),
    );
  });
  otherEvent = computed(() => {
    return this.visibleEvents().filter((ev) =>
      ['列车故障', '基地事件', '其他事件'].includes(ev.eventType),
    );
  });
}
