import { Component, Input, SimpleChanges } from '@angular/core';
import { UtilsService } from '../../../services/utils.service';
import { ConstructionAdjustmentData } from '../common-event-modal.component';

interface LineDetail {
  name: string;
  expand: boolean;
  detail: {
    start: string;
    end: string;
    value: string;
    label: string;
  }[];
}

@Component({
  selector: 'construction-item',
  imports: [],
  templateUrl: './construction-item.component.html',
  styleUrl: './construction-item.component.less',
})
export class ConstructionItemComponent {
  @Input() data!: ConstructionAdjustmentData;
  expand: boolean = false;
  lineDetails: LineDetail[] = [];
  constructor(private readonly utils: UtilsService) {}
  ngOnChanges(changes: SimpleChanges) {
    if (changes['data']) {
      this.resetLineDetails();
    }
  }
  resetLineDetails() {
    const evs = this.data.detail;
    const map = this.utils.separateEventsByLine(evs);
    const list: LineDetail[] = Array.from(map.entries()).map(([k, v]) => {
      return {
        name: k,
        expand: false,
        detail: v.map((ev) => {
          return {
            start: this.utils.formatTimeString(ev.fromDate),
            end: ev.toDate ? '' : this.utils.formatTimeString(ev.toDate),
            value: ev['items']['施工数量'],
            label: ev['items']['调整措施'],
          };
        }),
      };
    });
    this.lineDetails = list;
  }
  toggleCollapse() {
    this.expand = !this.expand;
  }
}
