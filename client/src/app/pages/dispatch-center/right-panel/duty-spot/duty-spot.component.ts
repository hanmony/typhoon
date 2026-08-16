import { Component, ElementRef, input, ViewChild } from '@angular/core';
import * as echarts from 'echarts';
import { ModuleHeaderComponent } from './../../module-header/module-header.component';

@Component({
  selector: 'duty-spot-module',
  imports: [ModuleHeaderComponent],
  templateUrl: './duty-spot.component.html',
  styleUrl: './duty-spot.component.less',
})
export class DutySpotComponent {
  @ViewChild('chartDom') chartDom!: ElementRef<HTMLDivElement>;

  large = input<boolean>(false);

  pieChart?: echarts.ECharts;

  ngAfterViewInit() {
    const dom = this.chartDom?.nativeElement;
    if (dom) {
      this.pieChart = echarts.init(dom);
      this.setOption();
    }
  }
  setOption() {
    this.pieChart?.setOption({
      tooltip: {
        trigger: 'item',
      },
      legend: {
        show: false,
      },
      color: ['#D08C1B', '#289DF5'],
      // total: total,
      series: [
        {
          type: 'pie',

          radius: ['70%', '84%'],
          avoidLabelOverlap: true,
          padAngle: 0,
          startAngle: 90,
          label: {
            show: false,
            position: 'center',
          },
          labelLine: {
            show: false,
          },
          data: [254, 100],
        },
      ],
    });
  }
}
