import { Component, Input, SimpleChanges } from '@angular/core';
import { ActionDto } from '../../../domain/action.dto';
import { LOCAL_EVENT_KEYS_MAP, UtilsService } from '../services/utils.service';

export interface CommonEventData {
  label: string;
  value: string;
  highlight?: boolean;
}

@Component({
  selector: 'common-event-detail-content',
  imports: [],
  templateUrl: './common-event-detail-content.component.html',
  styleUrl: './common-event-detail-content.component.less',
})
export class CommonEventDetailContentComponent {
  @Input() ev!: ActionDto;
  data: CommonEventData[] = [];
  constructor(private readonly utils: UtilsService) {}
  ngOnChanges(changes: SimpleChanges) {
    if (changes['ev']) {
      if (this.ev) {
        this.setSingleEventData(this.ev);
      } else {
        this.data = [];
      }
    }
  }
  setSingleEventData(ev: ActionDto) {
    const { items, fromDate, toDate, category } = ev;
    const label = LOCAL_EVENT_KEYS_MAP.find((k) => k[1] === category)?.[2];
    const itemsArray = Object.entries(items)
      .map(([k, v]) => {
        return {
          label: k,
          value: v,
          highlight: !!(label && k === label),
        };
      })
      .filter((v) => !['开始时间', '结束时间'].includes(v.label));
    this.data = [
      {
        label: '开始时间',
        value: this.utils.formatTimeString(fromDate),
      },
      {
        label: '结束时间',
        value: toDate ? this.utils.formatTimeString(toDate) : '',
      },
      ...itemsArray,
    ];
  }
}
