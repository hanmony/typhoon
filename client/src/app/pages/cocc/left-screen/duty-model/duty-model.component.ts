import { Component, computed, signal } from '@angular/core';
import { ApiService } from '../../../../services/api.service';
import { CommandService } from '../../../occ/map/command.service';
import { OccModalInputComponent } from '../../../occ/widget/input/input.component';
import {
  formatDutyDate as _formatDutyDate,
  getDutyDates,
  groupDutyByDate,
  pickCurrentDutyDate,
} from '../../../../shared/duty.util';

@Component({
  selector: 'cocc-duty-model',
  imports: [OccModalInputComponent],
  templateUrl: './duty-model.component.html',
  styleUrl: './duty-model.component.less',
})
export class CoccDutyModelComponent {
  /** 5 个值班日期（指挥开启当日 + 后 4 天） */
  dates: string[] = [];
  /** 固定部门字段列表（接口返回，保序去重） */
  departments: string[] = [];
  /** 按日期分组的值表：date -> department -> responsible */
  values = signal<Record<string, Record<string, string>>>({});
  /** 当前编辑中的日期 */
  activeDate = signal<string>('');

  activeDateLabel = computed(() => _formatDutyDate(this.activeDate()));

  /** 模板用：日期 YYYY-MM-DD → MM/DD */
  formatDutyDate(date: string) {
    return _formatDutyDate(date);
  }

  constructor(
    private api: ApiService,
    private commandService: CommandService,
  ) {}

  ngOnInit() {
    this.dates = getDutyDates(
      this.commandService.command?.startTime || Date.now(),
    );
    // 默认打开当天的 tab：窗口内取今天，超出 5 天取最后一天，早于开启日取第一天
    this.activeDate.set(pickCurrentDutyDate(this.dates));
    this.api.extreme.getDutyInfo().then((data) => {
      // 部门字段固定：取接口返回的部门集合
      this.departments = Array.from(
        new Set(data.map((item) => item.department)),
      );
      this.values.set(groupDutyByDate(data, this.dates));
    });
  }

  setActiveDate(date: string) {
    this.activeDate.set(date);
  }

  setValue(department: string, value: string) {
    const date = this.activeDate();
    this.values.update((prev) => ({
      ...prev,
      [date]: { ...prev[date], [department]: value },
    }));
  }

  async onSubmit() {
    const data: Extreme.DutyItem[] = [];
    for (const date of this.dates) {
      for (const department of this.departments) {
        data.push({
          date,
          department,
          responsible: this.values()[date]?.[department] || '',
        });
      }
    }
    await this.api.extreme.batchUpdateDutyInfo(data);
  }
}
