import { Component, computed, input, signal, ViewChild } from '@angular/core';
import { scaleInOut } from '../../../../common.animation';
import { OperationTableComponent } from '../../../dispatch-dashboard/dashboard-panel/operation-table/operation-table.component';
import { PanelHeaderComponent } from '../../../dispatch-dashboard/dashboard-panel/panel-header/panel-header.component';
import { OpRecordDrawerComponent } from '../../../dispatch-dashboard/op-record-drawer/op-record-drawer.component';
import { operationOnMapVisibilityFilter } from '../../../occ/occ.const';

@Component({
  selector: 'cocc-operation-table-panel',
  imports: [
    PanelHeaderComponent,
    OperationTableComponent,
    OpRecordDrawerComponent,
  ],
  templateUrl: './operation-table-panel.component.html',
  styleUrl: './operation-table-panel.component.less',
  animations: [scaleInOut],
})
export class OperationTablePanelComponent {
  @ViewChild(OpRecordDrawerComponent)
  opRecordDrawerRef?: OpRecordDrawerComponent;
  operations = input<ExtremeOcc.Operation[]>([]);

  tableOperations = computed(() => {
    return this.operations()
      .filter((o) => operationOnMapVisibilityFilter(o))
      .filter((o) => o.actionType !== '正线留车');
  });

  paginationConfig = input.required<{
    pageSize: number;
    pageIndex: number;
    autoTurn: boolean;
  }>();

  recordOperations = computed(() => {
    return this.operations()
      .filter((o) => !!o.isShow)
      .filter((o) => o.actionType !== '正线留车');
  });

  visible = signal(false);

  toggleVisible() {
    this.visible.set(!this.visible());
  }
  toggleRecordDrawer() {
    this.opRecordDrawerRef?.toggleVisible();
  }
}
