import {
  Component,
  computed,
  effect,
  ElementRef,
  input,
  ViewChild,
} from '@angular/core';
import * as echarts from 'echarts';

const colors = ['#0EA7F6', '#ffc24d'];

var rich = {
  yellow: {
    color: '#ffc24d',
    fontSize: 12,
    align: 'center',
  },

  label: {
    color: '#B5E1FF',
    align: 'center',
    fontSize: 11,
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

  pieChart?: echarts.ECharts;
  data = input.required<
    {
      name: string;
      value: number;
    }[]
  >();

  total = computed(() => {
    return this.data().reduce((acc, item) => acc + item.value, 0);
  });

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
    setTimeout(() => {
      const dom = this.chartDom?.nativeElement;
      if (dom) {
        this.pieChart = echarts.init(dom);
        this.setOption();
      }
    }, 500);
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
      grid: {
        top: '10%',
        bottom: '10%',
      },
      series: [
        {
          type: 'pie',
          radius: ['55%', '67%'],
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
            length: 4,
            length2: 4,
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
          radius: ['47%', '55%'],
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
              color: colors[i] + '42',
            },
          })),
        },
      ],
    });
  }
}
