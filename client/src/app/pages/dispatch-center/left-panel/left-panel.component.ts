import { Component, input, output } from '@angular/core';
import { DashboardFilterState } from '../../dispatch-dashboard/dashboard-map/action-overlay/action-overlay.component';
import { EmergencyRepairComponent } from './emergency-repair/emergency-repair.component';
import { EventSituationComponent } from './event-situation/event-situation.component';
import { InstructionTableComponent } from './instruction-table/instruction-table.component';
import { DsLineDataModuleComponent } from './line-data-module/line-data-module.component';
import { LineSituationComponent } from './line-situation/line-situation.component';

@Component({
  selector: 'dispatch-left-panel',
  imports: [
    InstructionTableComponent,
    LineSituationComponent,
    EventSituationComponent,
    EmergencyRepairComponent,
    DsLineDataModuleComponent,
  ],
  templateUrl: './left-panel.component.html',
  styleUrl: './left-panel.component.less',
})
export class DispatchLeftPanelComponent {
  allEvents = input<ExtremeOcc.Event[]>([]);
  events = input<ExtremeOcc.Event[]>([]);
  operations = input<ExtremeOcc.Operation[]>([]);
  locateEvent = output<ExtremeOcc.Event>();
  toDashboardWithState = output<DashboardFilterState>();
}
