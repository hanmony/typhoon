import { Component, effect, ElementRef, input, ViewChild } from '@angular/core';
import * as echarts from 'echarts';

const colors = [
  '#FFAC26',
  '#BAE7FF',
  '#1EE7E7',
  '#2F54EB',
  '#74A0C2',
  '#1890FF',
];

@Component({
  selector: 'dual-line-chart',
  imports: [],
  templateUrl: './dual-line-chart.component.html',
  styleUrl: './dual-line-chart.component.less',
})
export class DualLineChartComponent {
  @ViewChild('chartDom') chartDom!: ElementRef<HTMLDivElement>;

  pieChart?: echarts.ECharts;
  data = input.required<
    {
      name: string;
      value: number;
    }[]
  >();
  cacheData: {
    name: string;
    value: number;
  }[] = [];

  constructor() {
    effect(() => {
      this.setDataOptionIfNeed();
    });
  }

  ngAfterViewInit() {
    const dom = this.chartDom?.nativeElement;
    if (dom) {
      this.pieChart = echarts.init(dom);
      this.setOption();
    }
  }

  differentFromCache() {
    return this.data().some((v, i) => v.value !== this.cacheData[i]?.value);
  }
  setDataOptionIfNeed() {
    if (!this.differentFromCache()) return;
    this.pieChart?.setOption({
      series: [
        {
          data: this.data().map((v) => v.value),
        },
      ],
    });
    this.cacheData = this.data();
  }
  setOption() {
    this.pieChart?.setOption({
      tooltip: {
        trigger: 'item',
      },
      legend: {
        show: false,
      },
      series: [
        {
          type: 'pie',
          radius: ['60%', '70%'],
          avoidLabelOverlap: true,
          padAngle: 2,
          startAngle: 90,
          label: {
            show: false,
            position: 'center',
          },
          labelLine: {
            show: false,
          },
          tooltip: {
            show: true,
            formatter: (params: {
              seriesName: string;
              dataIndex: string | number;
              color: any;
              value: number;
            }) => {
              const item = this.data()[params.dataIndex];
              return `
              <span class="inline-block mr-1" style="width: 10px; height: 10px; background-color: ${params.color};"></span>
              <span class="mr-3">${item.name}</span>
              <span>${params.value}</span>
              `;
            },
          },
          data: this.data().map((v) => v.value),
          color: colors,
        },
        {
          type: 'pie',
          radius: ['70%', '90%'],
          avoidLabelOverlap: true,
          padAngle: 2,
          startAngle: 90,
          label: {
            show: false,
            position: 'center',
          },
          labelLine: {
            show: false,
          },
          tooltip: {
            show: false,
          },
          data: this.data().map((v, i) => ({
            value: v.value,
            itemStyle: {
              color: colors[i] + '22',
            },
          })),
        },
      ],
    });
  }
}
