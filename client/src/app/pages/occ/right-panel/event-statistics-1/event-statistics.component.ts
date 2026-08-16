import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';

@Component({
  selector: 'occ-event-statistics',
  imports: [CommonModule],
  templateUrl: './event-statistics.component.html',
  styleUrl: './event-statistics.component.less',
})
export class OccEventStatisticsComponent {
  data = [
    { label: '未处置', value: 5, percent: 0.1 },
    { label: '抢修中', value: 20, percent: 0.4 },
    { label: '已修复', value: 754, percent: 1 },
  ];
  eventTypes = [
    { label: '未处置', value: 5, percent: 0.1 },
    { label: '抢修中', value: 20, percent: 0.4 },
    { label: '已修复', value: 754, percent: 1 },
    { label: '未处置', value: 5, percent: 0.1 },
    { label: '抢修中', value: 20, percent: 0.4 },
    { label: '已修复', value: 754, percent: 1 },
  ];
  getOffsetX(index: number) {
    if (index % 2 === 0) {
      if (index % 4 === 0) {
        return -100;
      }
      return -120;
    }
    if ((index - 1) % 4 === 0) {
      return 100;
    }
    return 140;
  }
  getOffsetY(index: number) {
    return (Math.floor(index / 2) - 1) * 86 - 16;
  }
  getTransform(index: number) {
    return `translate(50%, 38px) rotate(calc(var(--rotation) + ${this.getRotateDeg(index)}deg))`;
  }
  getRotateDeg(index: number) {
    return (360 / this.eventTypes.length) * index;
  }
}
