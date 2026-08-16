import {
  Component,
  EventEmitter,
  Input,
  Output,
  SimpleChanges,
} from '@angular/core';
import { ActionCategory } from '../../../../domain/action.category';
import { ActionDto } from '../../../../domain/action.dto';
import { UtilsService } from '../../services/utils.service';
import { FormattedData } from '../autoplay-event-pandect-modal.component';

type DetailITem = { label: string; value: string | string[] };

interface Detail {
  items: DetailITem[];
  ev: ActionDto;
}
interface LineDetail {
  name: string;
  expand: boolean;
  detail: Detail[];
}

@Component({
  selector: 'auto-common-item',
  imports: [],
  templateUrl: './auto-common-item.component.html',
  styleUrl: './auto-common-item.component.less',
})
export class AutoCommonItemComponent {
  @Input() data!: FormattedData;
  expand: boolean = false;
  lineDetails: LineDetail[] = [];
  @Output() detailHandler = new EventEmitter<ActionDto>();
  @Output() locateHandler = new EventEmitter<ActionDto>();
  @Output() accessoryHandler = new EventEmitter<ActionDto>();
  constructor(private readonly utils: UtilsService) {}
  ngOnChanges(changes: SimpleChanges) {
    if (changes['data']) {
      this.resetLineDetails();
    }
  }
  getDetailOptions(ev: ActionDto): Detail {
    const { fromDate, toDate, items } = ev;
    const durationTime = [
      this.utils.formatTimeString(fromDate),
      this.utils.formatTimeString(toDate),
    ];
    switch (ev.category) {
      case ActionCategory.opevent: {
        const locations = this.utils.getLocalEventStations(ev);
        const locationType = items['类型'];
        const locationValue = items[locationType];
        return {
          items: [
            {
              label: '持续时间',
              value: durationTime,
            },
            {
              label: '地点',
              value: locationValue || locations,
            },
            { label: '上下行', value: items['上下行'] },
            { label: '存车线、折返线', value: items['存车线、折返线'] },
          ],
          ev,
        };
      }
      case ActionCategory.driving: {
        const locations = this.utils.getLocalEventStations(ev);
        return {
          items: [
            {
              label: '持续时间',
              value: durationTime,
            },
            {
              label: '地点',
              value: locations,
            },
            { label: '上下行', value: items['上下行'] },
            { label: '存车线、折返线', value: items['存车线、折返线'] },
          ],
          ev,
        };
      }
      case ActionCategory.transport: {
        const locations = this.utils.getLocalEventStations(ev);
        return {
          items: [
            {
              label: '持续时间',
              value: durationTime,
            },
            {
              label: '地点',
              value: locations,
            },
          ],
          ev,
        };
      }
      default:
        return {
          items: [],
          ev: ev,
        };
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
          return this.getDetailOptions(ev);
        }),
      };
    });
    this.lineDetails = list;
  }
  toggleCollapse() {
    this.expand = !this.expand;
  }
  handleDetail(ev: ActionDto) {
    this.detailHandler.emit(ev);
  }
  handleLocate(ev: ActionDto) {
    this.locateHandler.emit(ev);
  }
  handleViewAccessories(ev: ActionDto) {
    this.accessoryHandler.emit(ev);
  }
  isArray(value: any) {
    return Array.isArray(value);
  }
  hasAccessory(ev: ActionDto) {
    return this.utils.hasAccessory(ev);
  }
}
