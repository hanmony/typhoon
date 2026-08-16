import { Component, output } from '@angular/core';

const actionTools = [
  {
    name: '事件列表',
    image: 'assets/images/map/dock/construction-adjustments.png',
  },
  { name: '运营列表', image: 'assets/images/map/dock/driving-measures.png' },
];

@Component({
  selector: 'occ-dock',
  imports: [],
  templateUrl: './dock.component.html',
  styleUrl: './dock.component.less',
})
export class OccDockComponent {
  clickEventList = output<void>();
  clickOperationList = output<void>();

  actionTools = actionTools.map((tool) => ({
    ...tool,
    disabled: false,
  }));
  onToolClick(tool: (typeof actionTools)[number]) {
    // tool.disabled = !tool.disabled;
    if (tool.name === '事件列表') {
      this.clickEventList.emit();
    } else if (tool.name === '运营列表') {
      this.clickOperationList.emit();
    }
  }
}
