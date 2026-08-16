import {
  Component,
  ElementRef,
  Input,
  SimpleChanges,
  ViewChild,
} from '@angular/core';
import { AutoScrollComponent } from '../../../../shared/auto.scroll';
import { linesData2026 } from '../../../case-detail/services/meta';
import {
  effectDurationOptions,
  eventOnMapVisibilityFilter,
} from '../../../occ/occ.const';
import { DualChartComponent } from './dual-chart/dual-chart.component';

interface LineDataItem {
  name: string;
  value: number;
}

@Component({
  selector: 'supervisor-line-situation',
  imports: [DualChartComponent],
  templateUrl: './line-situation.component.html',
  styleUrl: './line-situation.component.less',
})
export class LineSituationComponent extends AutoScrollComponent {
  override fixHeight = 14 * 11;
  @ViewChild('scrollContainer')
  override scrollContainer!: ElementRef<HTMLDivElement>;

  @Input() events: ExtremeOcc.Event[] = [];
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

  ngOnChanges(simpleChanges: SimpleChanges) {
    if (simpleChanges['events']) {
      this.resetChartData();
      this.resetDurationData();
      this.resetLineEffectInfo();
    }
  }

  resetChartData() {
    const evs = this.events.filter(eventOnMapVisibilityFilter);
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
    const evs = this.events.filter(eventOnMapVisibilityFilter);
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
    const evs = this.events.filter((ev) => ev.isShow);
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
