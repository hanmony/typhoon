import {
  Component,
  computed,
  ElementRef,
  signal,
  ViewChild,
} from '@angular/core';
import { ApiService } from '../../../../services/api.service';
import { CommandService } from '../../../occ/map/command.service';
import { AutoScrollComponent } from '../../../../shared/auto.scroll';
import {
  getDutyDates,
  groupDutyByDate,
  pickCurrentDutyDate,
} from '../../../../shared/duty.util';

@Component({
  selector: 'supervisor-duty-table',
  imports: [],
  templateUrl: './duty-table.component.html',
  styleUrl: './duty-table.component.less',
})
export class DutyTableComponent extends AutoScrollComponent {
  @ViewChild('tableBody') override scrollContainer!: ElementRef<HTMLDivElement>;

  data = signal<Extreme.DutyItem[]>([]);
  paddingRows = computed(() => {
    const rows = this.data();
    const offset = 5 - rows.length;
    if (offset <= 0) return [];
    return Array.from({ length: offset }, () => ({
      content: '',
      isNew: false,
    }));
  });

  constructor(
    private api: ApiService,
    private commandService: CommandService,
  ) {
    super();
  }

  ngOnInit() {
    const tryLoad = () => {
      if (!this.commandService.command) return false;
      this.api.extreme.getDutyInfo().then((dutyItems) => {
        // 按当天展示：5 天窗口内取当天，超窗取最后一天
        const dates = getDutyDates(this.commandService.command.startTime);
        const current = groupDutyByDate(dutyItems, dates)[
          pickCurrentDutyDate(dates)
        ];
        this.data.set(
          Object.keys(current || {}).map((department) => ({
            department,
            responsible: (current && current[department]) || '',
          })),
        );
        this.setScrollHeight();
      });
      return true;
    };
    if (!tryLoad()) {
      this.commandService.commandSetupSubject$.subscribe(() => tryLoad());
    }
  }
}
