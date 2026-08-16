import { Component, computed, input, signal } from '@angular/core';
import dayjs from 'dayjs';
import { ExtremeTabsComponent } from '../../../../../common.component/extreme-tabs/extreme-tabs.component';
import {
  lineColorMap2026,
  linesData2026,
} from '../../../../case-detail/services/meta';
import { occEventTypes } from '../../../../occ/occ.const';
import { LibraryNzModule } from './../../../../../library.nz.module';
import { DualLineChartComponent } from './dual-line-chart/dual-line-chart.component';

const colors = [
  '#1890FF',
  '#1EE7E7',
  '#2F54EB',
  '#BAE7FF',
  '#FFAC26',
  '#fb7185',
  '#34d399',
  '#c084fc',
];

@Component({
  selector: 'cocc-line-event-module',
  imports: [LibraryNzModule, DualLineChartComponent, ExtremeTabsComponent],
  templateUrl: './line-event-module.component.html',
  styleUrl: './line-event-module.component.less',
})
export class CoccLineEventModuleComponent {
  events = input<ExtremeOcc.Event[]>([]);

  activeDuration = signal('今日数据');
  setActiveDuration(duration: string) {
    this.activeDuration.set(duration);
  }

  visibleEvents = computed(() => {
    return this.events().filter((ev) => ev.isShow);
  });

  lines = ['全线网', ...linesData2026.map((l) => l.name)];
  line = signal('全线网');
  lineColor = computed(() => {
    return lineColorMap2026.get(this.line()) || '#f9f902';
  });
  currentLineEvents = computed(() => {
    const isToday = this.activeDuration() === '今日数据';
    const line = this.line();
    let evs = this.visibleEvents();
    if (isToday) {
      const today = dayjs();
      evs = evs.filter((ev) => dayjs(ev.createTime).isSame(today, 'day'));
    }
    if (line !== '全线网') {
      evs = evs.filter((ev) => ev.line === line);
    }
    return [...occEventTypes.map((op) => op)].map((label, i) => ({
      name: label,
      value: evs.filter((ev) => ev.eventType === label).length,
      color: colors[i],
    }));
  });
  total = computed(() => {
    return this.currentLineEvents().reduce((acc, e) => acc + e.value, 0);
  });

  onLineChange(line: string) {}
}
