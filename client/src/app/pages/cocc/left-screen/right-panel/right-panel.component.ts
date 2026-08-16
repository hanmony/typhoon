import { CommonModule } from '@angular/common';
import { Component, input } from '@angular/core';
import { LeftScreenEventChartComponent } from './event-chart/event-chart.component';
import { LeftScreenHandleChartComponent } from './handle-chart/handle-chart.component';
import { CoccLineEventModuleComponent } from './line-event-module/line-event-module.component';

@Component({
  selector: 'left-screen-right-panel',
  imports: [
    CommonModule,
    CoccLineEventModuleComponent,
    LeftScreenHandleChartComponent,
    LeftScreenEventChartComponent,
  ],
  templateUrl: './right-panel.component.html',
  styleUrl: './right-panel.component.less',
  host: {
    class: 'custom-scroll-bar',
  },
})
export class LeftScreenRightPanelComponent {
  events = input<ExtremeOcc.Event[]>([]);
  operations = input<ExtremeOcc.Operation[]>([]);

  shouldShowEvents = input<ExtremeOcc.Event[]>([]);
  shouldShowOperations = input<ExtremeOcc.Operation[]>([]);
}
