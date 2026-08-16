import { CommonModule } from '@angular/common';
import { Component, ElementRef, input, ViewChild } from '@angular/core';
import { ApiService } from '../../../../services/api.service';
import { CommandService } from '../../../occ/map/command.service';
import { AutoScrollComponent } from '../../../../shared/auto.scroll';
import {
  getDutyDates,
  groupDutyByDate,
  pickCurrentDutyDate,
} from '../../../../shared/duty.util';

import { ModuleHeaderComponent } from './../../module-header/module-header.component';

export interface DispatchTableColumn {
  key: string;
  name: string;
  width?: number;
  align?: 'left' | 'center' | 'right';
  style?: Record<string, string>;
}

@Component({
  selector: 'instruction-table',
  imports: [ModuleHeaderComponent, CommonModule],
  templateUrl: './instruction-table.component.html',
  styleUrl: './instruction-table.component.less',
})
export class InstructionTableComponent extends AutoScrollComponent {
  @ViewChild('tableBody') override scrollContainer!: ElementRef<HTMLDivElement>;
  override fixHeight = 210;
  maxHeight = input(210);

  data: Extreme.DutyItem[] = [];
  columns: DispatchTableColumn[] = [
    {
      key: 'department',
      name: '单位名称',
      style: { color: '#01F1FE', 'padding-left': '16px' },
    },
    { key: 'responsible', name: '值班领导', width: 200 },
  ];

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
        this.data = Object.keys(current || {}).map((department) => ({
          department,
          responsible: (current && current[department]) || '',
        }));
        this.setScrollHeight();
      });
      return true;
    };
    if (!tryLoad()) {
      this.commandService.commandSetupSubject$.subscribe(() => tryLoad());
    }
  }
}
