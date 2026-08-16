import { Component, computed, input } from '@angular/core';
import { getPositionTextFromDto } from '../../../../../shared/shared.event.effect';

@Component({
  selector: 'detail-button',
  imports: [],
  templateUrl: './detail.component.html',
  styleUrl: './detail.component.less',
})
export class DetailButtonComponent {
  text = input.required<string>();
  detailOperations = input.required<ExtremeOcc.Operation[]>();
  /**
   * 10号线新江湾城站- 基隆路站(上下行)2号线
全线(上下行)
10号线
新江湾城站基隆路站绚糅上下行)-
10号线
运营:18
新江湾城站基隆路站(上下行)
   */
  dummyDetailInfo = [
    {
      line: '10号线',
      startStation: '新江湾城站',
      endStation: '基隆路站',
      direction: '上下行',
    },
    {
      line: '2号线',
      startStation: '全线',
      endStation: '',
      direction: '上下行',
    },
    {
      line: '10号线',
      startStation: '新江湾城站',
      endStation: '基隆路站',
      direction: '上下行',
    },
    {
      line: '10号线',
      startStation: '新江湾城站',
      endStation: '基隆路站',
      direction: '上下行',
    },
  ];

  // detailInfo = [
  //   ...this.dummyDetailInfo,
  //   ...this.dummyDetailInfo,
  //   ...this.dummyDetailInfo,
  //   ...this.dummyDetailInfo,
  // ];
  detailInfo = computed(() => {
    const ops = this.detailOperations();
    const map = new Map<string, ExtremeOcc.Operation[]>();
    ops.forEach((op) => {
      const curMap = map.get(op.line);
      if (curMap) {
        curMap.push(op);
      } else {
        map.set(op.line, [op]);
      }
    });
    const result = Array.from(map).map(([line, ops]) => {
      return {
        line,
        ops,
        isAllClose: false,
      };
    });
    result.forEach((r) => {
      if (r.ops.some((op) => op.locationType === '全线')) {
        r.isAllClose = true;
      }
    });
    return result;
  });

  getText(item: ExtremeOcc.Operation) {
    return getPositionTextFromDto(item);
  }
}
