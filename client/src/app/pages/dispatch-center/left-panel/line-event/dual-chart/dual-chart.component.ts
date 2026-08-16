import {
  Component,
  computed,
  effect,
  ElementRef,
  input,
  ViewChild,
} from '@angular/core';
import * as echarts from 'echarts';

const colors = ['#0EA7F6', '#FFC477'];

var rich = {
  yellow: {
    color: '#FFC477',
    fontSize: 16,
    align: 'center',
  },

  label: {
    color: '#B5E1FF',
    align: 'center',
    fontSize: 12,
    padding: [4, 0],
  },
  blue: {
    color: '#0EA7F6',
    fontSize: 12,
    align: 'center',
  },
};

@Component({
  selector: 'dual-chart',
  imports: [],
  templateUrl: './dual-chart.component.html',
  styleUrl: './dual-chart.component.less',
})
export class DualChartComponent {
  @ViewChild('chartDom') chartDom!: ElementRef<HTMLDivElement>;

  total = computed(() => {
    return this.data().reduce((acc, item) => acc + item.value, 0);
  });

  pieChart?: echarts.ECharts;
  data = input.required<
    {
      name: string;
      value: number;
    }[]
  >();

  constructor() {
    effect(() => {
      if (this.data()) {
        this.setOption();
      }
    });
  }

  getItemColor(index: number) {
    return colors[index % colors.length];
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
          radius: ['52%', '64%'],
          avoidLabelOverlap: true,
          padAngle: 1,
          startAngle: 90,
          label: {
            formatter: (params) => {
              const total = this.data().reduce(
                (sum, item) => sum + item.value,
                0,
              );
              const item = this.data()[params.dataIndex];
              const richKey = params.dataIndex % 2 === 0 ? 'blue' : 'yellow';
              const percent = total
                ? ((params.value / total) * 100).toFixed(1) || 0
                : 0;
              return `{${richKey}|` + percent + '%}\n{label|' + item.name + '}';
            },
            rich: rich,
          },
          labelLine: {
            show: true,
            length: 8,
            length2: 16,
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
          radius: ['44%', '52%'],
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
