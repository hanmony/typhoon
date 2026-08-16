import { CommonModule } from '@angular/common';
import { Component, computed, input, signal } from '@angular/core';
import dayjs from 'dayjs';
import { ExtremeTabsComponent } from '../../../../common.component/extreme-tabs/extreme-tabs.component';
import { occEventTypes } from '../../occ.const';

@Component({
  selector: 'occ-event-statistics',
  imports: [CommonModule, ExtremeTabsComponent],
  templateUrl: './event-statistics.component.html',
  styleUrl: './event-statistics.component.less',
})
export class OccEventStatisticsComponent {
  events = input<ExtremeOcc.Event[]>([]);
  activeDuration = signal('今日数据');
  setActiveDuration(duration: string) {
    this.activeDuration.set(duration);
  }

  eventTypes = computed(() => {
    const isToday = this.activeDuration() === '今日数据';
    let evs = this.events();
    if (isToday) {
      const today = dayjs();
      evs = evs.filter((ev) => dayjs(ev.createTime).isSame(today, 'day'));
    }
    return occEventTypes.map((label) => {
      return {
        label,
        value: evs.filter((e) => e.eventType === label).length,
      };
    });
  });

  getOffsetX(index: number) {
    if (index === 0 || index === 6) {
      return -100;
    }
    if (index === 3 || index === 5) {
      return -120;
    }
    if (index === 1 || index === 7) {
      return 100;
    }
    return 140;
  }
  getOffsetY(index: number) {
    return (Math.floor(index / 2) - 1) * 68 - 24;
  }
  getTransform(index: number) {
    return `translate(${this.getOffsetX(index)}px, ${this.getOffsetY(index)}px)`;
  }
  total = computed(() => {
    return this.eventTypes().reduce((acc, e) => acc + e.value, 0);
  });
}
