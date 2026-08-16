import {
  Component,
  ElementRef,
  input,
  SimpleChanges,
  ViewChild,
} from '@angular/core';
import * as echarts from 'echarts';

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
      color: string;
    }[]
  >();
  ngOnChanges(changes: SimpleChanges) {
    if (changes['data']) {
      this.setOption();
    }
  }
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
      series: [
        {
          type: 'pie',
          radius: ['50%', '60%'],
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
          color: this.data().map((v) => v.color),
        },
        {
          type: 'pie',
          radius: ['60%', '80%'],
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
              color: v.color + '22',
            },
          })),
        },
      ],
    });
  }
}
