import { CommonModule } from '@angular/common';
import { Component, computed, input, signal } from '@angular/core';
import { DutyTableComponent } from './duty-table/duty-table.component';
import { LineSituationComponent } from './line-situation/line-situation.component';
import { RealTimeCloseComponent } from './real-time-close/real-time-close.component';

@Component({
  selector: 'supervisor-panel',
  imports: [
    CommonModule,
    DutyTableComponent,
    LineSituationComponent,
    RealTimeCloseComponent,
  ],
  templateUrl: './supervisor-panel.component.html',
  styleUrl: './supervisor-panel.component.less',
})
export class SupervisorPanelComponent {
  collapse = signal(false);
  isHide = input<boolean>(false);

  events = input<ExtremeOcc.Event[]>([]);
  shownEvents = computed(() => {
    return this.events().filter((e) => !!e.isShow);
  });
  operations = input<ExtremeOcc.Operation[]>([]);

  toggleCollapse() {
    this.collapse.set(!this.collapse());
  }
}
