import {
  Component,
  effect,
  ElementRef,
  input,
  signal,
  ViewChild,
} from '@angular/core';
import dayjs from 'dayjs';
import * as echarts from 'echarts';
import { ExtremeTabsComponent } from '../../../../../common.component/extreme-tabs/extreme-tabs.component';
import { getOption } from './getOption';

@Component({
  selector: 'left-screen-event-chart',
  imports: [ExtremeTabsComponent],
  templateUrl: './event-chart.component.html',
  styleUrl: './event-chart.component.less',
})
export class LeftScreenEventChartComponent {
  @ViewChild('chart') chartElement!: ElementRef<HTMLDivElement>;
  chart?: echarts.ECharts;

  events = input<ExtremeOcc.Event[]>([]);

  activeDuration = signal('今日数据');
  setActiveDuration(duration: string) {
    this.activeDuration.set(duration);
  }

  constructor() {
    effect(() => {
      const isToday = this.activeDuration() === '今日数据';
      let evs = this.events();
      if (isToday) {
        const today = dayjs();
        evs = evs.filter((ev) => dayjs(ev.createTime).isSame(today, 'day'));
      }
      this.chart?.setOption(
        getOption([
          evs.filter((ev) => !!ev.severity).length,
          evs.filter((ev) => !ev.severity).length,
        ]),
      );
    });
  }

  ngAfterViewInit() {
    const dom = this.chartElement?.nativeElement;
    if (dom) {
      this.chart = echarts.init(dom);
    }
  }
}
