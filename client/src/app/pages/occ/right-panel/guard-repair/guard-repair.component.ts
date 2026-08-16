import {
  Component,
  ElementRef,
  Input,
  SimpleChanges,
  ViewChild,
} from '@angular/core';
import dayjs from 'dayjs';
import * as echarts from 'echarts';
import { ExtremeTabsComponent } from '../../../../common.component/extreme-tabs/extreme-tabs.component';

const fontSize = 10;

const rich = {
  white: {
    color: '#fff',
    align: 'left',
    fontSize: fontSize * 1.4,
    lineHeight: fontSize * 3,
  },

  inherit: {
    color: 'inherit',
    fontSize: fontSize * 1.8,
    align: 'left',
  },
};

@Component({
  selector: 'occ-guard-repair',
  imports: [ExtremeTabsComponent],
  templateUrl: './guard-repair.component.html',
  styleUrl: './guard-repair.component.less',
})
export class OccGuardRepairComponent {
  @ViewChild('chartDom') chartDom!: ElementRef<HTMLDivElement>;
  pieChart?: echarts.ECharts;

  activeDuration = '今日数据';
  setActiveDuration(duration: string) {
    this.activeDuration = duration;
    this.data = this.getData();
    this.setOption();
  }

  @Input() events: ExtremeOcc.Event[] = [];

  data = [
    {
      value: 0,
      name: '未处置',
    },
    {
      value: 0,
      name: '抢修中',
    },
    {
      value: 0,
      name: '已修复',
    },
  ];
  getData() {
    const isToday = this.activeDuration === '今日数据';
    let evs = this.events.slice();
    if (isToday) {
      const today = dayjs();
      evs = evs.filter((ev) => dayjs(ev.createTime).isSame(today, 'day'));
    }

    const list = evs.filter((e) => !!e.isShow).filter((e) => e.urgentRepair);
    const unprocessed = list.filter((e) => e.urgentRepairStatus === 0).length;
    const repairing = list.filter((e) => e.urgentRepairStatus === 1).length;
    const repaired = list.filter((e) => e.urgentRepairStatus === 2).length;
    return [
      { name: '未处置', value: unprocessed },
      { name: '抢修中', value: repairing },
      { name: '已修复', value: repaired },
    ];
  }

  ngAfterViewInit() {
    const dom = this.chartDom?.nativeElement;
    if (dom) {
      setTimeout(() => {
        this.pieChart = echarts.init(dom);
        this.setOption();
      }, 300);
    }
  }

  ngOnChanges(changes: SimpleChanges) {
    if (changes['events']) {
      this.data = this.getData();
      this.setOption();
    }
  }
  setOption() {
    this.pieChart?.setOption({
      backgroundColor: 'transparent',
      series: [
        {
          name: 'pie',
          type: 'pie',
          center: ['50%', '50%'],
          radius: ['44%', '66%'],
          // color: ['#42DEFF', '#6395F9', '#1383E7'],
          // color: ['#42DEFF', '#fdba74', '#99f6e4'],
          color: ['#38bdf8', '#fdba74', '#6ee7b7'],
          label: {
            formatter: function (params: { name: string; value: number }) {
              return (
                '{white|' + params.name + '}\n{inherit|' + params.value + '}'
              );
            },
            rich: rich,
          },
          data: this.data,
        },
      ],
    });
  }
}
