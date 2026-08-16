import { Component, effect, ElementRef, input, ViewChild } from '@angular/core';
import * as echarts from 'echarts';
import {
  operationOnMapVisibilityFilter,
  operationSubActions,
} from '../../../../occ/occ.const';
import { getOption } from './getOption';

@Component({
  selector: 'left-screen-line-chart',
  imports: [],
  templateUrl: './line-chart.component.html',
  styleUrl: './line-chart.component.less',
})
export class LeftScreenLineChartComponent {
  @ViewChild('chart') chartElement!: ElementRef<HTMLDivElement>;

  operations = input<ExtremeOcc.Operation[]>([]);

  separateOperations: {
    type: string;
    count: number;
  }[] = operationSubActions.map((op) => ({
    type: op.name,
    count: 0,
  }));

  constructor() {
    effect(() => {
      const ops = this.operations().filter(operationOnMapVisibilityFilter);

      this.separateOperations.forEach((op) => {
        op.count = 0;
      });
      ops.forEach((op) => {
        const subOp = this.separateOperations.find(
          (o) => o.type === op.actionType,
        );
        if (subOp) {
          subOp.count++;
        }
      });
      this.chart?.setOption(
        getOption(this.separateOperations, window.innerWidth),
      );
    });
  }

  chart?: echarts.ECharts;

  ngAfterViewInit() {
    const dom = this.chartElement?.nativeElement;
    if (dom) {
      this.chart = echarts.init(dom);
      this.chart.setOption(
        getOption(this.separateOperations, window.innerWidth),
      );
    }
  }
}
