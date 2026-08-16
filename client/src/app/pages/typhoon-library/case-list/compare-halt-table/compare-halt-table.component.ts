import { Component, inject } from '@angular/core';
import { NZ_MODAL_DATA } from 'ng-zorro-antd/modal';
import { ActionDto } from '../../../../domain/action.dto';
import { LocalEventReactService } from '../../../case-detail/services/local-event-react.service';
import { UtilsService } from '../../../case-detail/services/utils.service';

export interface IHaltModalData {
  events: ActionDto[];
}

@Component({
  selector: 'compare-halt-table',
  imports: [],
  templateUrl: './compare-halt-table.component.html',
  styleUrl: './compare-halt-table.component.less',
})
export class CompareHaltTableComponent {
  readonly nzModalData: IHaltModalData = inject(NZ_MODAL_DATA);

  get list() {
    return this.nzModalData.events.filter(
      (ev) => ev.items['行车措施'] === '停运',
    );
  }
  constructor(
    private readonly utils: UtilsService,
    private readonly react: LocalEventReactService,
  ) {}
  getHaltLine(ev: ActionDto) {
    return ev.items['线路号'];
  }
  getTime(ev: ActionDto) {
    const dateFormatter = (d: Date) => {
      d = new Date(d);
      let str = `${d.getMonth() + 1}月${d.getDate()}日`;
      const hours = d.getHours();
      const minutes = d.getMinutes();
      if (hours > 0) {
        str += `${d.getHours()}时`;
        if (minutes > 0) {
          str += `${d.getMinutes()}分`;
        }
      } else {
        if (minutes > 0) {
          str += `0时${d.getMinutes()}分`;
        }
      }
      return str;
    };
    if ((ev.toDate as unknown as string) === '2999-12-31T16:00:00.000Z') {
      return dateFormatter(ev.fromDate);
    }
    return dateFormatter(ev.fromDate) + ' - ' + dateFormatter(ev.toDate);
  }
  getWeekday(ev: ActionDto) {
    const formDateString = this.utils.formatTimeString(ev.fromDate);
    const chineseTranslations = ['日', '一', '二', '三', '四', '五', '六'];
    const date = new Date(formDateString).getDay();
    return `星期${chineseTranslations[date]}`;
  }
  getLocation(ev: ActionDto) {
    return this.react.getLocations(ev).join(' - ');
  }
}
