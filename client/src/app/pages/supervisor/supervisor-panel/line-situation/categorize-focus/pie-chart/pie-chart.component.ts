import { Component, effect, ElementRef, input, ViewChild } from '@angular/core';
import * as echarts from 'echarts';

@Component({
  selector: 'focus-pie-chart',
  imports: [],
  templateUrl: './pie-chart.component.html',
  styleUrl: './pie-chart.component.less',
})
export class PieChartComponent {
  @ViewChild('chartDom') chartDom!: ElementRef<HTMLDivElement>;

  centerLabel = input<string>('');

  pieChart?: echarts.ECharts;
  data = input.required<
    {
      name: string;
      value: number;
      color: string;
    }[]
  >();

  constructor() {
    effect(() => {
      if (this.data()) {
        this.setOption();
      }
    });
  }

  ngAfterViewInit() {
    const dom = this.chartDom?.nativeElement;
    if (dom) {
      this.pieChart = echarts.init(dom);
      this.setOption();
    }
  }

  setOption() {
    if (this.data().length === 0) return;
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
          radius: ['80%', '81%'],
          avoidLabelOverlap: true,
          padAngle: 1,
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
          data: [
            {
              value: 1,
              itemStyle: {
                color: new echarts.graphic.LinearGradient(0, 0, 0, 0.8, [
                  { offset: 0, color: '#3372D2' },
                  { offset: 0.333, color: '#24B6FF' },
                  { offset: 0.666, color: '#C0D1F2' },
                  { offset: 1, color: '#2475EB' },
                ]),
                opacity: 0.16,
              },
            },
          ],
        },
        {
          type: 'pie',
          radius: ['49%', '65%'],
          avoidLabelOverlap: true,
          padAngle: 1,
          startAngle: 90,
          label: {
            show: false,
          },
          labelLine: {
            show: false,
          },
          tooltip: {
            show: true,
            // formatter: (params: {
            //   seriesName: string;
            //   dataIndex: string | number;
            //   color: any;
            //   value: number;
            // }) => {
            //   const item = this.data()[params.dataIndex];
            //   return `
            //   <span class="inline-block mr-1" style="width: 6px; height: 6px; background-color: ${params.color};"></span>
            //   <span class="mr-2">${item.name}</span>
            //   <span>${params.value}</span>
            //   `;
            // },
          },
          data: this.data().map((v) => v.value),
          color: this.data().map((v) => v.color),
        },
        {
          type: 'pie',
          radius: ['45%', '49%'],
          avoidLabelOverlap: true,
          padAngle: 1,
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
          data: [
            {
              value: 1,
              itemStyle: {
                color: new echarts.graphic.LinearGradient(0, 0, 0, 0.8, [
                  { offset: 0, color: '#4EBA4E' },
                  { offset: 0.333, color: '#24B6FF' },
                  { offset: 0.666, color: '#C0D1F2' },
                  { offset: 1, color: '#2475EB' },
                ]),
                opacity: 0.51,
              },
            },
          ],
        },
      ],
    });
  }
}
