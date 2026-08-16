import { Component, computed, effect, input, signal } from '@angular/core';
import { horizontalInOutReverse } from '../../../../common.animation';

@Component({
  selector: 'dd-statistic-overlay',
  imports: [],
  templateUrl: './statistic-overlay.component.html',
  styleUrl: './statistic-overlay.component.less',
  animations: [horizontalInOutReverse],
})
export class StatisticOverlayComponent {
  currentType = input<string>('event');
  events = input<ExtremeOcc.Event[]>([]);
  operations = input<ExtremeOcc.Operation[]>([]);

  currentTypeText = computed(() => {
    return this.currentType() === 'event' ? '事件' : '运营';
  });
  constructor() {
    effect(() => {
      this.events();
      this.operations();
      if (this.currentType() === 'event') {
        this.setEventData();
      } else {
        this.setOperationData();
      }
    });
  }
  data = signal([
    {
      label: '事件总数',
      value: 10,
      icon: '/assets/images/occ/notification-event-important.png',
      hue: 0,
    },
  ]);

  setEventData() {
    this.data.set([
      {
        label: '事件总数',
        value: this.events().length,
        icon: '/assets/images/occ/notification-event-important.png',
        hue: 0,
      },
      {
        label: '督办事件数',
        value: this.events().filter((ev) => ev.supervision).length,
        icon: '/assets/images/occ/notification-event-today.png',
        hue: 0,
      },
      {
        label: '重点事件数',
        value: this.events().filter((ev) => ev.severity).length,
        icon: '/assets/images/occ/notification-event-important.png',
        hue: 180,
      },
    ]);
  }

  setOperationData() {
    const ops = this.operations();

    this.data.set([
      {
        label: '停运调整',
        value: ops.filter((op) => op.actionType === '停运').length,
        icon: '/assets/images/occ/notification-event-important.png',
        hue: 0,
      },
      {
        label: '间隔调整',
        value: ops.filter((op) => op.actionType === '间隔调整').length,
        icon: '/assets/images/occ/notification-event-today.png',
        hue: 0,
      },
      {
        label: '限速调整',
        value: ops.filter((op) => op.actionType === '限速').length,
        icon: '/assets/images/occ/notification-event-important.png',
        hue: 180,
      },
      {
        label: '站点关闭',
        value: ops.filter((op) => op.actionType === '站点关闭').length,
        icon: '/assets/images/occ/notification-event-important.png',
        hue: 224,
      },
    ]);
  }
}
