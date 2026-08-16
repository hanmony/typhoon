import { Component, computed, input } from '@angular/core';
import dayjs from 'dayjs';

@Component({
  selector: 'occ-line-operation',
  imports: [],
  templateUrl: './line-operation.component.html',
  styleUrl: './line-operation.component.less',
})
export class OccLineOperationComponent {
  operations = input<ExtremeOcc.Operation[]>([]);

  types = computed(() => {
    const map = new Map<
      string,
      { name: string; data: ExtremeOcc.Operation[] }
    >();
    this.operations()
      .filter((o) => !!o.isShow)
      .forEach((o) => {
        if (map.has(o.actionType)) {
          map.get(o.actionType)?.data.push(o);
        } else {
          map.set(o.actionType, { name: o.actionType, data: [o] });
        }
      });
    return Array.from(map.values());
  });

  computedData = computed(() => {
    return this.types().map((t) => {
      return {
        name: t.name,
        data: this.getRenderData(t.data),
      };
    });
  });

  getRenderData(data: ExtremeOcc.Operation[]) {
    return data
      .filter((op) => !!op.isShow)
      .map((o, index) => ({
        number: index + 1,
        value: this.positionText(o),
        additional: this.getAdditionalText(o),
        additionalColor: this.getAdditionalColor(o),
      }));
  }

  positionText(o: ExtremeOcc.Operation) {
    if (o.actionType === '站点关闭') {
      return o.startStation;
    }
    return `${o.startStation} — ${o.endStation}`;
  }

  getAdditionalText(o: ExtremeOcc.Operation) {
    if (o.endTime) {
      return dayjs(o.endTime).format('MM/DD HH:mm');
    }
    return '';
  }

  getAdditionalColor(o: ExtremeOcc.Operation) {
    if (o.actionType === '限速') {
      return '#2CD7FA';
    }
    return '';
  }

  // types = [
  //   {
  //     name: '停运',
  //     data: dummyStopData,
  //   },
  //   {
  //     name: '晚点',
  //     data: dummyDelayData,
  //   },
  //   {
  //     name: '限速',
  //     data: dummySpeedData,
  //     additionalColor: '#2CD7FA',
  //   },
  // ];
}
