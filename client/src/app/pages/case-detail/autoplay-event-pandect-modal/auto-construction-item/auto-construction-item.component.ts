import { Component, Input, SimpleChanges } from '@angular/core';
import { UtilsService } from '../../services/utils.service';
import { FormattedData } from '../autoplay-event-pandect-modal.component';

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
  selector: 'auto-construction-item',
  imports: [],
  templateUrl: './auto-construction-item.component.html',
  styleUrl: './auto-construction-item.component.less',
})
export class AutoConstructionItemComponent {
  @Input() data!: FormattedData;
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
