import { Component, computed, input, output, signal } from '@angular/core';
import { NzPaginationModule } from 'ng-zorro-antd/pagination';
import { LibraryNzModule } from '../../../../library.nz.module';
import { DASHBOARD_PRESET_CONFIG } from '../../const.dashboard';

@Component({
  selector: 'dashboard-panel-header',
  imports: [LibraryNzModule, NzPaginationModule],
  templateUrl: './panel-header.component.html',
  styleUrl: './panel-header.component.less',
})
export class PanelHeaderComponent {
  title = input.required<string>();
  type = input.required<string>();
  closeable = input(false);
  onClose = output<void>();
  paginationConfig = input<{
    pageSize: number;
    pageIndex: number;
    autoTurn: boolean;
  }>({
    pageSize: 8,
    pageIndex: 1,
    autoTurn: false,
  });
  handleAutoTurn = output<void>();
  toggleRecordDrawer = output<void>();
  total = input.required<number>();
  preset = signal<string | null>(null);
  onPresetChange = output<string>();
  onPageIndexChange = output<number>();
  presetOptions = DASHBOARD_PRESET_CONFIG;

  showPagination = computed(() => {
    return this.type() === 'event';
  });
  showTotal = computed(() => {
    return this.type() === 'event';
  });
  showPreset = computed(() => {
    return this.type() === 'event';
  });
  showRecordButton = computed(() => {
    return this.type() === 'operation';
  });
}
