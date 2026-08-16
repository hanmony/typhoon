import {
  Component,
  ElementRef,
  Input,
  SimpleChanges,
  ViewChild,
} from '@angular/core';
import { linesData2026 } from '../../../case-detail/services/meta';
import { getAnimationFrame } from '../../../case-detail/utils';
import { effectDurationOptions } from '../../../occ/occ.const';
import { ModuleHeaderComponent } from './../../module-header/module-header.component';
import { DualChartComponent } from './dual-chart/dual-chart.component';

interface LineDataItem {
  name: string;
  value: number;
}
@Component({
  selector: 'line-event-module',
  imports: [ModuleHeaderComponent, DualChartComponent],
  templateUrl: './line-event.component.html',
  styleUrl: './line-event.component.less',
})
export class LineEventComponent {
  @ViewChild('scrollContainer') scrollContainer!: ElementRef<HTMLDivElement>;
  @Input() events: ExtremeOcc.Event[] = [];
  scrollHeight = 256;
  scrollPosition = -50;
  lineCount = linesData2026.length;
  effectDurations = effectDurationOptions.map((item) => ({
    label: item.label,
    key: item.value,
    value: 0,
  }));

  chartData: LineDataItem[] = [
    { name: '未运营', value: 0 },
    { name: '影响运营', value: this.events.length },
  ];

  lineEffectInfo = linesData2026.map((l) => ({
    name: l.name,
    effected: 0,
    normal: 0,
  }));

  ngAfterViewInit() {
    this.setScrollHeight();
    this.autoScroll();
  }
  ngOnChanges(simpleChanges: SimpleChanges) {
    if (simpleChanges['events']) {
      this.resetChartData();
      this.resetDurationData();
      this.resetLineEffectInfo();
    }
  }
  setScrollHeight() {
    setTimeout(() => {
      this.scrollHeight = this.scrollContainer.nativeElement.scrollHeight;
    });
  }
  animationFrameTimer?: number;
  animationFrameFunc = getAnimationFrame();
  autoScroll() {
    this.animationFrameTimer = this.animationFrameFunc(() => {
      if (this.scrollPosition < this.scrollHeight - 256 + 100) {
        this.scrollPosition += 0.75;
      } else {
        this.scrollPosition = -100;
      }
      this.scrollContainer.nativeElement.scrollTop = this.scrollPosition;
      this.autoScroll();
    });
  }
  ngOnDestroy() {
    if (this.animationFrameTimer) {
      cancelAnimationFrame(this.animationFrameTimer);
    }
  }

  resetChartData() {
    const evs = this.events.filter((ev) => !!ev.isShow);
    const total = evs.length;
    const effected = evs.filter((ev) => !!ev.effect);

    this.chartData = [
      { name: '未影响', value: total - effected.length },
      { name: '影响运营', value: effected.length },
    ];
  }
  resetDurationData() {
    this.effectDurations.forEach((item) => {
      item.value = 0;
    });
    const evs = this.events.filter((ev) => ev.effect && ev.isShow);
    evs.forEach((ev) => {
      const duration = ev.effectDuration;
      if (duration) {
        const durationItem = this.effectDurations.find(
          (item) => item.key === duration,
        );
        if (durationItem) {
          durationItem.value++;
        }
      }
    });
  }
  resetLineEffectInfo() {
    this.lineEffectInfo.forEach((item) => {
      item.effected = 0;
      item.normal = 0;
    });
    const evs = this.events.filter((ev) => !!ev.isShow);
    evs.forEach((ev) => {
      const lineInfo = this.lineEffectInfo.find(
        (item) => item.name === ev.line,
      );
      if (lineInfo) {
        if (ev.effect) {
          lineInfo.effected++;
        } else {
          lineInfo.normal++;
        }
      }
    });
  }
}
