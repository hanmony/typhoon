import { Component, output, signal } from '@angular/core';

export interface ToolItem {
  name: string;
  image: string;
  inactive?: boolean;
}

const actionTools = [
  {
    name: '抢修状态',
    image: 'assets/images/map/dock/repair.png',
    inactive: false,
  },
  {
    name: '线路情况',
    image: 'assets/images/map/dock/line.png',
    inactive: false,
  },
  {
    name: '事件情况',
    image: 'assets/images/map/dock/event.png',
    inactive: false,
  },
  {
    name: '事件列表',
    image: 'assets/images/map/dock/document.png',
    inactive: true,
  },
  {
    name: '运营列表',
    image: 'assets/images/map/dock/folder.png',
    inactive: true,
  },
  {
    name: '模拟巡道',
    image: 'assets/images/map/dock/patrolling.png',
    inactive: true,
  },
  {
    name: '值班信息',
    image: 'assets/images/map/dock/duty.png',
    inactive: true,
  },
  {
    name: '图例说明',
    image: 'assets/images/map/dock/illustration-icon.png',
    inactive: true,
  },
];

@Component({
  selector: 'cocc-dock',
  imports: [],
  templateUrl: './dock.component.html',
  styleUrl: './dock.component.less',
})
export class CoccDockComponent {
  dockX = signal(document.documentElement.clientWidth - 420 - 56 - 8);

  clickEventList = output<void>();
  clickOperationList = output<void>();

  setEffectVisibility = output<ToolItem>();

  actionTools: ToolItem[] = actionTools.map((tool) => ({
    ...tool,
  }));
  bottomActionTools: ToolItem[] = [
    {
      name: '应急响应',
      image: 'assets/images/map/dock/response.png',
      inactive: true,
    },
    {
      name: '通告汇报',
      image: 'assets/images/map/dock/notification.png',
      inactive: true,
    },
  ];

  onToolClick(tool: ToolItem) {
    // tool.disabled = !tool.disabled;
    tool.inactive = !tool.inactive;
    if (tool.name === '事件列表') {
      const oppositeItem = this.actionTools.find((t) => t.name === '运营列表');
      if (oppositeItem && !tool.inactive) {
        oppositeItem.inactive = true;
      }
      this.clickEventList.emit();
      return;
    } else if (tool.name === '运营列表') {
      const oppositeItem = this.actionTools.find((t) => t.name === '事件列表');
      if (oppositeItem && !tool.inactive) {
        oppositeItem.inactive = true;
      }
      this.clickOperationList.emit();
      return;
    }
    this.setEffectVisibility.emit(tool);
  }

  toggleToolActivity(tool: string) {
    const target = [...this.actionTools, ...this.bottomActionTools].find(
      (t) => t.name === tool,
    );
    if (target) {
      target.inactive = !target.inactive;
    }
  }

  setDockX() {
    this.dockX.set(document.documentElement.clientWidth - 420 - 56 - 8);
  }

  ngAfterViewInit() {
    this.setDockX();
  }
}
