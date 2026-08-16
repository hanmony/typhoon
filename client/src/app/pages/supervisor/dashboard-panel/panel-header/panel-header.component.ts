import { Component, computed, input, output, signal } from '@angular/core';
import { NzPaginationModule } from 'ng-zorro-antd/pagination';
import { LibraryNzModule } from '../../../../library.nz.module';
import { DASHBOARD_PRESET_CONFIG } from '../../../dispatch-dashboard/const.dashboard';

@Component({
  selector: 'supervisor-panel-header',
  imports: [LibraryNzModule, NzPaginationModule],
  templateUrl: './panel-header.component.html',
  styleUrl: './panel-header.component.less',
})
export class SupervisorPanelHeaderComponent {
  title = input.required<string>();
  type = input.required<string>();
  onClose = output<void>();

  toggleType = output<void>();

  paginationConfig = input<{
    pageSize: number;
    pageIndex: number;
    autoTurn: boolean;
  }>({
    pageSize: 10,
    pageIndex: 1,
    autoTurn: false,
  });
  presetOptions = DASHBOARD_PRESET_CONFIG;

  handleAutoTurn = output<void>();
  toggleRecordDrawer = output<void>();
  total = input.required<number>();
  preset = signal<string | null>(null);
  onPresetChange = output<string>();
  onPageIndexChange = output<number>();

  isEventTable = computed(() => this.type() === 'event');
  isOperationTable = computed(() => this.type() === 'operation');
}
