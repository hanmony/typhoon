import { CommonModule } from '@angular/common';
import { Component, computed, input } from '@angular/core';
import { CategorizeRepairComponent } from '../categorize-repair/categorize-repair.component';
import { PieChartComponent } from './pie-chart/pie-chart.component';

@Component({
  selector: 'supervisor-categorize-focus',
  imports: [CommonModule, PieChartComponent, CategorizeRepairComponent],
  templateUrl: './categorize-focus.component.html',
  styleUrl: './categorize-focus.component.less',
})
export class CategorizeFocusComponent {
  // @Input() events: ExtremeOcc.Event[] = [];
  events = input<ExtremeOcc.Event[]>([]);

  legends = [
    { label: '普通事件', color: '#8E5FEC' },
    { label: '重点事件', color: '#B8560F' },
  ];

  total = computed(() => {
    const evs = this.events();
    return {
      total: evs.length,
      focus: evs.filter((ev) => ev.severity).length,
      repair: evs.filter((ev) => ev.urgentRepair).length,
    };
  });

  focusData = computed(() => {
    const evs = this.events();
    return [
      {
        name: '重点事件',
        value: evs.filter((ev) => ev.severity).length,
        color: '#C36B2F',
      },
      {
        name: '普通事件',
        value: evs.filter((ev) => !ev.severity).length,
        color: '#A284E0',
      },
    ];
  });
  severityPercentage = computed(() => {
    const evs = this.events();
    const total = evs.length;
    const severityCount = evs.filter((ev) => ev.severity).length;
    if (!total) return '0%';
    return Math.floor((severityCount / total) * 100) + '%';
  });

  repairData = computed(() => {
    const evs = this.events().filter((ev) => ev.urgentRepair);
    return [
      {
        name: '抢修完成',
        value: evs.filter((ev) => ev.urgentRepairStatus === 2).length,
        color: '#4EB030',
      },
      {
        name: '未抢修',
        value: evs.filter((ev) => ev.urgentRepairStatus === 0).length,
        color: '#537BF9',
      },
      {
        name: '抢修中',
        value: evs.filter((ev) => ev.urgentRepairStatus === 1).length,
        color: '#A284E0',
      },
    ];
  });
}
