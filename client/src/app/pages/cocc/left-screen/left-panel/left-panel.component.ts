import { Component, input } from '@angular/core';
import { LeftScreenLineChartComponent } from './line-chart/line-chart.component';
import { CoccLineOperationModuleComponent } from './line-operation-module/line-operation-module.component';

@Component({
  selector: 'cocc-left-panel',
  imports: [CoccLineOperationModuleComponent, LeftScreenLineChartComponent],
  templateUrl: './left-panel.component.html',
  styleUrl: './left-panel.component.less',
  host: {
    class: 'custom-scroll-bar',
  },
})
export class CoccLeftPanelComponent {
  lines = input<string[]>([]);
  events = input<ExtremeOcc.Event[]>([]);
  operations = input<ExtremeOcc.Operation[]>([]);
  isHide = input<boolean>(false);
}
