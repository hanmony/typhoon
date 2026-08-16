import {
  Component,
  computed,
  effect,
  HostBinding,
  input,
  signal,
} from '@angular/core';
import dayjs from 'dayjs';
import { horizontalInOut } from '../../../common.animation';
import { getPositionTextFromDto } from '../../../shared/shared.event.effect';
import { lineNames } from '../../case-detail/services/meta';

interface DayRecord {
  day: string;
  operations: ExtremeOcc.Operation[];
}

@Component({
  selector: 'dashboard-op-record-drawer',
  imports: [],
  templateUrl: './op-record-drawer.component.html',
  styleUrl: './op-record-drawer.component.less',
  animations: [horizontalInOut],
})
export class OpRecordDrawerComponent {
  visible = signal(false);
  @HostBinding('class.full-block') get fullBlock() {
    return this.visible();
  }
  toggleVisible() {
    this.visible.update((prev) => !prev);
  }
  close() {
    this.visible.set(false);
  }
  open() {
    this.visible.set(true);
  }

  operations = input<ExtremeOcc.Operation[]>([]);
  shownOperations = computed(() => {
    return this.operations().filter((o) => !!o.isShow);
  });

  dayRecords = signal<DayRecord[]>([]);

  constructor() {
    effect(() => {
      const ops = this.shownOperations();
      const records: DayRecord[] = [];
      ops.forEach((o) => {
        const day = dayjs(o.startTime).format('MM月DD日');
        const record = records.find((r) => r.day === day);
        if (record) {
          record.operations.push(o);
        } else {
          records.push({
            day,
            operations: [o],
          });
        }
      });
      records.forEach((r) => {
        this.sortOpsByTimeThenLine(r.operations);
      });
      this.dayRecords.set(records);
    });
  }

  sortOpsByTimeThenLine(ops: ExtremeOcc.Operation[]) {
    return ops.sort((a, b) => {
      if (
        this.formatStartTime(a.startTime) === this.formatStartTime(b.startTime)
      ) {
        const aIndex = lineNames.indexOf(a.line);
        const bIndex = lineNames.indexOf(b.line);
        return aIndex - bIndex;
      }
      const startA = new Date(a.startTime).getTime();
      const startB = new Date(b.startTime).getTime();

      return startB - startA;
    });
  }

  formatStartTime(time: string) {
    return dayjs(time).format('HH:mm');
  }
  getPlanedEndTime(op: ExtremeOcc.Operation) {
    if (op.isEndTimeOptional) return '待定';
    return this.formatStartTime(op.endTime);
  }
  getActualEndTime(op: ExtremeOcc.Operation) {
    if (!op.actualEndTime) return '';
    const end = dayjs(op.endTime).format('MM月DD日');
    const actualEnd = dayjs(op.actualEndTime).format('MM月DD日');
    if (end !== actualEnd) {
      return `${this.formatStartTime(op.actualEndTime)} (${actualEnd})`;
    }
    return this.formatStartTime(op.actualEndTime);
  }
  getPositionText(op: ExtremeOcc.Operation) {
    return getPositionTextFromDto(op, true);
  }
  getDirectionText(op: ExtremeOcc.Operation) {
    return op.locationType === '区间' ? op.direction || '' : '';
  }
  getActionTagColor(action: string) {
    return (
      {
        停运: '#ef4444',
        间隔调整: '#2D256F',
        正线留车: '#2db391',
        限速: '#FFB835',
        站点关闭: '#ef4444',
      }[action] || '#2db391'
    );
  }
}
