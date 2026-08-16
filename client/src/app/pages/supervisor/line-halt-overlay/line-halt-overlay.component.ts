import {
  Component,
  ElementRef,
  Input,
  SimpleChanges,
  ViewChild,
} from '@angular/core';
import dayjs from 'dayjs';
import * as echarts from 'echarts';
import { getPositionTextFromDto } from '../../../shared/shared.event.effect';
import { linesData2026 } from '../../case-detail/services/meta';

const fontSize = 8;

const rich = {
  white: {
    color: '#fff',
    align: 'left',
    fontSize: fontSize * 1.2,
    lineHeight: fontSize * 1.5,
  },

  inherit: {
    color: 'inherit',
    fontSize: fontSize * 1.6,
    align: 'left',
  },
};

@Component({
  selector: 'supervisor-line-halt-overlay',
  imports: [],
  templateUrl: './line-halt-overlay.component.html',
  styleUrl: './line-halt-overlay.component.less',
})
export class LineHaltOverlayComponent {
  @ViewChild('chartDom') chartDom!: ElementRef<HTMLDivElement>;
  pieChart?: echarts.ECharts;

  @Input() operations: ExtremeOcc.Operation[] = [];

  data = [
    {
      value: 0,
      name: '全线停运',
    },
    {
      value: 0,
      name: '缩线停运',
    },
    {
      value: 21,
      name: '正常线路',
    },
  ];
  halt: {
    entire: { line: string; op: ExtremeOcc.Operation }[];
    partial: { line: string; ops: ExtremeOcc.Operation[] }[];
  } = {
    entire: [],
    partial: [],
  };
  setData() {
    const ops = this.operations.slice();
    const allLines = linesData2026.map((l) => l.name);

    const entireHaltOps = ops.filter(
      (e) => e.actionType === '停运' && e.locationType === '全线',
    );
    const partialHaltOps = ops.filter(
      (e) => e.actionType === '停运' && e.locationType !== '全线',
    );
    const entireHaltLineCount = new Set(entireHaltOps.map((e) => e.line)).size;
    const partialHaltLineCount = new Set(partialHaltOps.map((e) => e.line))
      .size;
    const normal = allLines.length - entireHaltLineCount - partialHaltLineCount;
    this.data = [
      { name: '全线停运', value: entireHaltLineCount },
      { name: '缩线停运', value: partialHaltLineCount },
      { name: '正常线路', value: normal },
    ];
    const entireHaltLineMap = new Map<string, ExtremeOcc.Operation>();
    entireHaltOps.forEach((op) => {
      if (!entireHaltLineMap.has(op.line)) {
        entireHaltLineMap.set(op.line, op);
      } else {
        const exist = entireHaltLineMap.get(op.line)!;
        if (
          new Date(op.startTime).getTime() > new Date(exist.startTime).getTime()
        ) {
          entireHaltLineMap.set(op.line, op);
        }
      }
    });

    const partialHaltLineMap = new Map<string, ExtremeOcc.Operation[]>();
    partialHaltOps.forEach((op) => {
      if (!partialHaltLineMap.has(op.line)) {
        partialHaltLineMap.set(op.line, [op]);
      } else {
        partialHaltLineMap.get(op.line)!.push(op);
      }
    });

    this.halt = {
      entire: Array.from(entireHaltLineMap).map(([line, op]) => ({
        line,
        op,
      })),
      partial: Array.from(partialHaltLineMap).map(([line, ops]) => ({
        line,
        ops,
      })),
    };
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
    if (changes['operations']) {
      this.setData();
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
          radius: ['38%', '60%'],
          color: ['#1383E7', '#42DEFF', '#6395F9'],
          label: {
            formatter: function (params: { name: string; value: number }) {
              return (
                '{white|' + params.name + '}\n{inherit|' + params.value + '}'
              );
            },
            rich: rich,
          },
          labelLine: {
            length: 8,
            length2: 10,
          },
          data: this.data,
        },
      ],
    });
  }
  getStartTime(op: ExtremeOcc.Operation) {
    return dayjs(op.startTime).format('HH:mm');
  }
  getPosition(op: ExtremeOcc.Operation) {
    return getPositionTextFromDto(op);
  }
}
