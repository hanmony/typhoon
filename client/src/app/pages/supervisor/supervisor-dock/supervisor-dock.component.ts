import { Component, output } from '@angular/core';

export interface ToolItem {
  name: string;
  image: string;
  inactive?: boolean;
}

const actionTools = [
  {
    name: '台风路径',
    image: 'assets/images/map/dock/typhoon-path-large.png',
    inactive: false,
  },
  {
    name: '天气动画',
    image: 'assets/images/map/dock/typhoon-circle-large.png',
    inactive: false,
  },
  {
    name: '站点名称',
    image: 'assets/images/map/dock/station-large.png',
    inactive: true,
  },
  {
    name: '气象记录',
    image: 'assets/images/map/dock/cloud.png',
    inactive: true,
  },
  {
    name: '图例说明',
    image: 'assets/images/map/dock/illustration-icon.png',
    inactive: true,
  },
];

@Component({
  selector: 'supervisor-dock',
  imports: [],
  templateUrl: './supervisor-dock.component.html',
  styleUrl: './supervisor-dock.component.less',
})
export class SupervisorDockComponent {
  clickEventList = output<void>();
  clickOperationList = output<void>();

  setEffectVisibility = output<ToolItem>();

  actionTools: ToolItem[] = actionTools.map((tool) => ({
    ...tool,
  }));

  onToolClick(tool: ToolItem) {
    // tool.disabled = !tool.disabled;
    tool.inactive = !tool.inactive;
    this.setEffectVisibility.emit(tool);
  }

  setToolInactive(name: string, boolean: boolean) {
    const target = this.actionTools.find((t) => t.name === name);
    if (target) {
      target.inactive = boolean;
    }
  }
}
