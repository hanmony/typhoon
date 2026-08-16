import {
  Component,
  ElementRef,
  EventEmitter,
  Input,
  Output,
  SimpleChanges,
  ViewChild,
} from '@angular/core';
import * as echarts from 'echarts';
import { linesData2026 } from '../../../case-detail/services/meta';
import {
  DashboardFilterState,
  getInitialDashboardState,
} from '../../../dispatch-dashboard/dashboard-map/action-overlay/action-overlay.component';
import { operationOnMapVisibilityFilter } from '../../../occ/occ.const';
import { ModuleHeaderComponent } from './../../module-header/module-header.component';
import { DetailButtonComponent } from './detail/detail.component';

const coverColor = 'rgba(0, 162, 255, .2)';
const placeHolderStyle = {
  itemStyle: {
    color: 'transparent',
  },
  tooltip: {
    show: false,
  },
  emphasis: {
    visible: false,
    color: 'rgba(0,0,0,0)',
  },
};

const createGradient = (startColor: string, endColor: string) => {
  return new echarts.graphic.LinearGradient(0, 1, 1, 0, [
    {
      offset: 0,
      color: startColor,
    },
    {
      offset: 1,
      color: endColor,
    },
  ]);
};
interface DataItem {
  value: number;
  name: string;
}

const dummyStopData: DataItem[] = [
  { value: 0, name: '正常运营' },
  { value: 0, name: '缩线停运' },
  { value: 0, name: '全线停运' },
];

const dummyIntervalAdjustData: DataItem[] = [
  { value: 0, name: '正常运营' },
  { value: 0, name: '间隔调整' },
];

const dummyEarlyInspectionData: DataItem[] = [
  { value: 0, name: '正常运营' },
  { value: 0, name: '提前巡道' },
];

@Component({
  selector: 'line-situation-module',
  imports: [ModuleHeaderComponent, DetailButtonComponent],
  templateUrl: './line-situation.component.html',
  styleUrl: './line-situation.component.less',
})
export class LineSituationComponent {
  @ViewChild('chartDom') chartDom!: ElementRef<HTMLDivElement>;

  @Input() operations: ExtremeOcc.Operation[] = [];
  @Output() toDashboardWithState = new EventEmitter<DashboardFilterState>();

  data: DataItem[] = dummyStopData;
  detailOperations: ExtremeOcc.Operation[] = [];

  pieChart?: echarts.ECharts;
  tabs = ['停运', '间隔调整', '限速', '站点关闭'];
  activeTab = '停运';

  onTabItemClick(tab: string) {
    const rerender = this.activeTab !== tab;
    this.activeTab = tab;
    switch (tab) {
      case '停运':
        this.data = this.getDataWithStopState();
        break;
      case '间隔调整':
        this.data = this.getDataWithIntervalAdjustState();
        break;
      // case '提前巡道':
      //   this.data = this.getDataWithEarlyInspectionState();
      case '限速':
        this.data = this.getDataWithLimitSpeedState();
        break;
      case '站点关闭':
        this.data = this.getDataWithStationCloseState();
        break;
    }
    this.setDetailOperations();
    this.setOption(rerender);
  }
  toDashboard(ev: MouseEvent) {
    ev.stopPropagation();
    const state = getInitialDashboardState();
    this.toDashboardWithState.emit({
      ...state,
      type: 'operation',
      operation: {
        ...state.operation,
        type: this.activeTab,
      },
    });
  }
  getDataWithStopState(): DataItem[] {
    const ops = this.operations
      .filter(operationOnMapVisibilityFilter)
      .filter((op) => {
        return op.actionType === '停运';
      });
    const closeAll = ops
      .filter((op) => op.locationType === '全线')
      .map((op) => op.line);
    const closeAllSet = new Set(closeAll);
    const partialClose = ops
      .filter((op) => op.locationType !== '全线' && !closeAllSet.has(op.line))
      .map((op) => op.line);
    const partialCloseSet = new Set(partialClose);
    const otherValue =
      linesData2026.length - partialCloseSet.size - closeAllSet.size;
    return [
      { value: otherValue, name: '正常运营' },
      { value: partialCloseSet.size, name: '缩线停运' },
      { value: closeAllSet.size, name: '全线停运' },
    ];
  }
  getDataWithIntervalAdjustState(): DataItem[] {
    const ops = this.operations
      .filter(operationOnMapVisibilityFilter)
      .filter((op) => {
        return op.actionType === '间隔调整';
      });
    const addJustLine = ops.map((op) => op.line);

    const addJustLineSet = new Set(addJustLine);
    const otherValue = linesData2026.length - addJustLineSet.size;
    return [
      { value: otherValue, name: '正常运营' },
      { value: addJustLineSet.size, name: '间隔调整' },
    ];
  }
  getDataWithStationCloseState() {
    const closeData = this.separatedLineCloseData(this.operations);
    return [
      {
        value: closeData.reduce((acc, l) => acc + l.normal, 0),
        name: '正常运营站点',
      },
      {
        value: closeData.reduce((acc, l) => acc + l.closed, 0),
        name: '关闭站点',
      },
    ];
  }
  separatedLineCloseData = (ops: ExtremeOcc.Operation[]) => {
    const closeOps = ops.filter(operationOnMapVisibilityFilter).filter((op) => {
      return op.actionType === '站点关闭';
    });
    return linesData2026.map((line) => {
      const mainStations = line.points.filter(
        (point) => point.type === 'station',
      );
      const branchStations = Array.from(line.branches.values())
        .flat()
        .map((p) => (p.type === 'station' ? p : null))
        .filter((p) => p !== null);
      const allStations = [...mainStations, ...branchStations];

      const currentLineCloseOps = closeOps.filter(
        (op) => op.line === line.name,
      );
      const closeStations = new Set(
        currentLineCloseOps.map((op) => op.startStation),
      );

      return {
        name: line.name,
        normal: allStations.length - closeStations.size,
        closed: closeStations.size,
      };
    });
  };
  getDataWithEarlyInspectionState(): DataItem[] {
    const ops = this.operations
      .filter(operationOnMapVisibilityFilter)
      .filter((op) => {
        return op.actionType === '提前巡道';
      });
    const earlyInspectionLine = ops.map((op) => op.line);

    const earlyInspectionLineSet = new Set(earlyInspectionLine);
    const otherValue = linesData2026.length - earlyInspectionLineSet.size;
    return [
      { value: otherValue, name: '正常运营' },
      { value: earlyInspectionLineSet.size, name: '提前巡道' },
    ];
  }

  getDataWithLimitSpeedState() {
    const ops = this.operations
      .filter(operationOnMapVisibilityFilter)
      .filter((op) => {
        return op.actionType === '限速';
      });
    const lines = ops.map((op) => op.line);

    const lineSet = new Set(lines);
    const otherValue = linesData2026.length - lineSet.size;
    return [
      { value: otherValue, name: '正常运营' },
      { value: lineSet.size, name: '限速' },
    ];
  }

  setDetailOperations() {
    const curTime = Date.now();
    const ops = this.operations.filter((op) => {
      return (
        op.actionType === this.activeTab &&
        op.isShow &&
        new Date(op.startTime).getTime() < curTime &&
        new Date(op.endTime).getTime() > curTime
      );
    });
    this.detailOperations = ops;
  }

  ngAfterViewInit() {
    const dom = this.chartDom?.nativeElement;
    this.data = this.getDataWithStopState();
    if (dom) {
      this.pieChart = echarts.init(dom);
      this.setOption();
    }
  }

  ngOnChanges(simpleChanges: SimpleChanges) {
    if (simpleChanges['operations']) {
      this.onTabItemClick(this.activeTab);
    }
  }
  setOption(rerender = false) {
    const colors = [
      ['#4FACFE', '#00F2FE'],
      ['#FF7F00', '#FF7F00'],
      ['#FF4500', '#FF4500'],
    ];
    const gradientColors = colors.map((item) =>
      createGradient(item[0], item[1]),
    );
    const hasThirdPart = !!this.data[2];
    const total = this.data.reduce((acc, item) => acc + item.value, 0);
    const firstStartAngle = 360 * (this.data[0].value / total) + 90;
    const secondStartAngle = 90;
    const thirdStartAngle = hasThirdPart
      ? 360 * ((this.data[0].value + this.data[2].value) / total) + 90
      : 0;

    const series: echarts.EChartsCoreOption['series'][] = [
      {
        type: 'pie',
        radius: ['67%', '87%'],
        avoidLabelOverlap: true,
        startAngle: 90,
        emphasis: {
          scale: false,
        },
        tooltip: {
          show: false,
        },
        label: {
          show: false,
          position: 'center',
        },
        labelLine: {
          show: false,
        },
        data: [
          {
            value: total,
            name: 'cover',
          },
        ],
      },
      {
        type: 'pie',
        radius: ['67%', '73%'],
        avoidLabelOverlap: true,
        padAngle: 1,
        startAngle: firstStartAngle,
        label: {
          show: false,
          position: 'center',
        },
        labelLine: {
          show: false,
        },
        data: [
          {
            value: this.data[0].value,
            name: this.data[0].name,
          },
          {
            value: total - this.data[0].value,
            name: 'invisible',
            ...placeHolderStyle,
          },
        ],
      },
      {
        type: 'pie',
        radius: ['74%', '80%'],
        avoidLabelOverlap: true,
        padAngle: 1,
        startAngle: secondStartAngle,
        label: {
          show: false,
          position: 'center',
        },
        labelLine: {
          show: false,
        },
        data: [
          {
            value: this.data[1].value,
            name: this.data[1].name,
          },
          {
            value: total - this.data[1].value,
            name: 'invisible',
            ...placeHolderStyle,
          },
        ],
      },
    ];
    if (this.data[2]) {
      series.push({
        type: 'pie',
        radius: ['81%', '87%'],
        avoidLabelOverlap: true,
        padAngle: 1,
        startAngle: thirdStartAngle,
        label: {
          show: false,
          position: 'center',
        },
        labelLine: {
          show: false,
        },
        data: [
          {
            value: this.data[2].value,
            name: this.data[2].name,
          },
          {
            value: total - this.data[2].value,
            name: 'invisible',
            ...placeHolderStyle,
          },
        ],
      });
    }
    series.push({
      type: 'pie',
      radius: ['45%', '67%'],
      avoidLabelOverlap: true,
      startAngle: 90,
      tooltip: {
        show: false,
      },
      label: {
        show: false,
        position: 'center',
      },
      labelLine: {
        show: false,
      },
      data: [
        {
          value: total,
          name: 'cover',
        },
      ],
      itemStyle: {
        color: 'rgba(0, 162, 255, .1)',
      },
    });
    if (rerender) {
      this.pieChart?.clear();
    }
    this.pieChart?.setOption({
      tooltip: {
        trigger: 'item',
      },
      legend: {
        show: false,
      },
      color: [coverColor, ...gradientColors],
      total: total,
      series: series,
    });
  }
}
