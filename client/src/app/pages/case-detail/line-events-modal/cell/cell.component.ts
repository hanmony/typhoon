import { Component, EventEmitter, Input, Output } from '@angular/core';
import { ActionCategory } from '../../../../domain/action.category';
import { ActionDto } from '../../../../domain/action.dto';
import { LibraryNzModule } from '../../../../library.nz.module';
import { LocalEventReactService } from '../../services/local-event-react.service';
import { UtilsService } from '../../services/utils.service';

@Component({
  selector: 'line-events-modal-table-cell',
  imports: [LibraryNzModule],
  templateUrl: './cell.component.html',
  styleUrl: './cell.component.less',
})
export class LineEventsModalTableCellComponent {
  @Input() event!: ActionDto;
  @Input() key: string = '';
  @Output() handleLocate = new EventEmitter<{
    event: ActionDto;
    move: boolean;
  }>();

  showTooltip = false;
  constructor(
    private readonly utils: UtilsService,
    private readonly localEventReactService: LocalEventReactService,
  ) {}
  renderCell(key: string, event: ActionDto) {
    switch (key) {
      case 'time': {
        return this.renderTimeCell(event);
      }
      case 'event': {
        return this.renderEventCell(event);
      }
      case 'location': {
        return this.renderLocationCell(event);
      }
      default:
        return '';
    }
  }
  onLocateIconClock() {
    this.handleLocate.emit({
      event: this.event,
      move: true,
    });
  }
  renderTimeCell(event: ActionDto) {
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
    if ((event.toDate as unknown as string) === '2999-12-31T16:00:00.000Z') {
      return dateFormatter(event.fromDate);
    }
    return [dateFormatter(event.fromDate), '-', dateFormatter(event.toDate)];
  }
  renderEventCell(event: ActionDto) {
    return this.utils.getLocalEventSubType(event);
  }
  renderLocationCell(event: ActionDto) {
    const stations = this.utils.getLocalEventStations(event);
    if (Array.isArray(stations)) {
      return [stations[0], '-', stations[1]];
    }
    return stations;
  }
  get data() {
    return this.renderCell(this.key, this.event);
  }
  get isArray() {
    return Array.isArray(this.data);
  }
  get shouldTooltip() {
    if (this.event.category !== ActionCategory.transport) {
      return false;
    }
    const stations = this.utils.getLocalEventStations(this.event || []);
    if (!Array.isArray(stations) && stations !== '全线') {
      return false;
    }
    return true;
  }
  getStations(event: ActionDto) {
    const stations = this.utils.getLocalEventStations(event);
    const line = this.localEventReactService.getLine(event);
    if (!line) return [];
    if (stations === '全线') {
      return line.getSliceStations(stations, stations);
    } else if (Array.isArray(stations)) {
      return line.getSliceStations(stations[0], stations[1]);
    }
    return [];
  }
  onTooltipItemClick(stationString: string) {
    this.showTooltip = false;
    const line = this.localEventReactService.getLine(this.event);
    if (!line) return;
    this.handleLocate.emit({
      event: this.event,
      move: false,
    });
    line.locateStation(stationString);
  }
}
