import { Component, effect, input, signal } from '@angular/core';
import dayjs from 'dayjs';
import { verticalInOut } from '../../../common.animation';
import { ExtremeSelectComponent } from '../../../common.component/extreme-select/extreme-select.component';
import { linesData2026 } from '../../case-detail/services/meta';
import { CommandService } from '../../occ/map/command.service';
import { occEventCategories } from '../../occ/occ.const';

const colors = [
  '#1890FF',
  '#1EE7E7',
  '#2F54EB',
  '#BAE7FF',
  '#FFAC26',
  '#fb7185',
  '#34d399',
  '#c084fc',
];

@Component({
  selector: 'supervisor-line-statistic-overlay',
  imports: [ExtremeSelectComponent],
  templateUrl: './line-statistic-overlay.component.html',
  styleUrl: './line-statistic-overlay.component.less',
  animations: [verticalInOut],
})
export class LineStatisticOverlayComponent {
  visible = signal<boolean>(false);

  events = input<ExtremeOcc.Event[]>([]);
  operations = input<ExtremeOcc.Operation[]>([]);
  line = input('1号线');
  selectedDate = signal('all');
  dateOptions = signal([
    {
      label: '全部',
      value: 'all',
    },
  ]);

  separatedLineData = linesData2026.map((line) => {
    const mainStations = line.points.filter(
      (point) => point.type === 'station',
    );
    const branchStations = Array.from(line.branches.values())
      .flat()
      .map((p) => (p.type === 'station' ? p : null))
      .filter((p) => p !== null);
    const allStations = [...mainStations, ...branchStations];
    return {
      name: line.name,
      total: allStations.length,
    };
  });

  state = signal<{
    closeCount: number;
    closePercent: string;
    categories: { name: string; count: number; color: string }[];
    pendingStateCount: number | string;
    repairingStateCount: number | string;
    finishedStateCount: number | string;
  }>({
    closeCount: 0,
    closePercent: '0%',
    categories: occEventCategories.map((item, index) => ({
      name: item.label,
      count: 0,
      color: colors[index],
    })),
    pendingStateCount: 0,
    repairingStateCount: 0,
    finishedStateCount: 0,
  });

  onDateChange(date: string | string[]) {
    this.selectedDate.set(date as string);
  }
  constructor(private commandService: CommandService) {
    effect(() => {
      this.setState();
    });
    commandService.commandSetupSubject$.subscribe(() => {
      this.setDateOptions();
    });
  }

  toggleVisible() {
    this.visible.update((prev) => !prev);
  }
  close() {
    this.visible.set(false);
  }
  open() {
    const visible = this.visible();
    if (visible) {
      this.visible.set(false);
      setTimeout(() => {
        this.visible.set(true);
      }, 300);
    } else {
      this.visible.set(true);
    }
  }
  setDateOptions() {
    this.dateOptions.set([
      {
        label: '全部',
        value: 'all',
      },
      ...this.dates.map((d) => ({ label: d, value: d })),
    ]);
  }

  ngAfterViewInit() {
    this.setDateOptions();
  }

  setState() {
    const line = this.line();
    const date = this.selectedDate();
    if (date === 'all') {
      this.setStateWithTotal(line);
    } else {
      this.setStateWithDate(line, date);
    }
  }
  setStateWithTotal(line: string) {
    const evs = this.events().filter((ev) => ev.isShow && ev.line === line);
    const ops = this.operations().filter((op) => op.isShow && op.line === line);
    const lineData = this.separatedLineData.find((l) => l.name === line)!;
    const closeOperations = ops.filter((ev) => ev.actionType === '站点关闭');
    const closeCount = new Set(closeOperations.map((ev) => ev.startStation))
      .size;
    const closePercent = Math.floor((closeCount / lineData.total) * 100) + '%';

    const urgentRepairEvents = evs.filter((ev) => ev.urgentRepair);
    const pendingStateCount = urgentRepairEvents.filter(
      (ev) => ev.urgentRepairStatus === 0,
    ).length;
    const repairingStateCount = urgentRepairEvents.filter(
      (ev) => ev.urgentRepairStatus === 1,
    ).length;
    const finishedStateCount = urgentRepairEvents.filter(
      (ev) => ev.urgentRepairStatus === 2,
    ).length;

    this.state.set({
      closeCount,
      closePercent,
      categories: occEventCategories.map((item, index) => ({
        name: item.label,
        count: evs.filter((ev) => item.contains.includes(ev.eventType)).length,
        color: colors[index],
      })),
      pendingStateCount,
      repairingStateCount,
      finishedStateCount,
    });
  }
  setStateWithDate(line: string, date: string) {
    const evs = this.events().filter((ev) => ev.isShow && ev.line === line);
    const ops = this.operations().filter((op) => op.isShow && op.line === line);
    const lineData = this.separatedLineData.find((l) => l.name === line)!;
    const closeOperations = ops.filter(
      (ev) => ev.actionType === '站点关闭' && ev.startTime.startsWith(date),
    );
    const closeCount = new Set(closeOperations.map((ev) => ev.startStation))
      .size;
    const closePercent = Math.floor((closeCount / lineData.total) * 100) + '%';

    const urgentRepairEvents = evs.filter(
      (ev) => ev.urgentRepair && ev.terminated && ev.endTime.startsWith(date),
    );
    const finishedStateCount = urgentRepairEvents.length;

    const certainDateEvs = evs.filter((ev) => ev.startTime.startsWith(date));
    this.state.set({
      closeCount,
      closePercent,
      categories: occEventCategories.map((item, index) => ({
        name: item.label,
        count: certainDateEvs.filter((ev) =>
          item.contains.includes(ev.eventType),
        ).length,
        color: colors[index],
      })),
      pendingStateCount: '-',
      repairingStateCount: '-',
      finishedStateCount,
    });
  }

  get command() {
    return this.commandService.command;
  }
  get commandStartTime() {
    return this.command?.startTime;
  }
  get dates() {
    const start = dayjs(this.commandStartTime);
    const end = dayjs();
    const diffHours = end.diff(start, 'hour');
    const dates: string[] = [];
    for (let i = 0; i <= Math.ceil(diffHours / 24); i++) {
      dates.push(start.add(i, 'day').format('YYYY-MM-DD'));
    }
    return dates;
  }
}
