import {
  animate,
  state,
  style,
  transition,
  trigger,
} from '@angular/animations';
import { Component, output, signal } from '@angular/core';

export interface ToolItem {
  name: string;
  image: string;
  inactive?: boolean;
}

const actionTools = [
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
    name: '台风路径',
    image: 'assets/images/map/dock/typhoon-path.png',
    inactive: false,
  },
  {
    name: '天气动画',
    image: 'assets/images/map/dock/typhoon-circle.png',
    inactive: false,
  },
  {
    name: '站点名称',
    image: 'assets/images/map/dock/station.png',
    inactive: true,
  },
  {
    name: '图例说明',
    image: 'assets/images/map/dock/illustration-icon.png',
    inactive: true,
  },
  {
    name: '智慧工具',
    image: 'assets/images/map/dock/toolbox.png',
    inactive: true,
  },
];

const intelligentTools = [
  {
    name: '台风对比',
    image: 'assets/images/dispatch-center/intelligent-tool/compare-icon.png',
    inactive: true,
  },
  {
    name: '模拟巡道',
    image: 'assets/images/dispatch-center/intelligent-tool/patrolling-icon.png',
    inactive: true,
  },
];

@Component({
  selector: 'dc-dock',
  imports: [],
  templateUrl: './dock.component.html',
  styleUrl: './dock.component.less',
  animations: [
    trigger('zoomInOut', [
      state(
        'in',
        style({ transform: 'translate(0, 0%) scale(1)', opacity: 1 }),
      ),
      transition('void => *', [
        style({ opacity: 0, transform: 'translate(30%, 0) scale(0)' }),
        animate('200ms cubic-bezier(0.35, 0, 0.25, 1)'),
      ]),
      transition('* => void', [
        animate(
          '200ms cubic-bezier(0.35, 0, 0.25, 1)',
          style({ opacity: 0, transform: 'translate(30%, 0) scale(0)' }),
        ),
      ]),
    ]),
  ],
})
export class DispatchCenterDockComponent {
  clickEventList = output<void>();
  clickOperationList = output<void>();

  intelligentVisible = signal(false);

  setEffectVisibility = output<ToolItem>();

  actionTools: ToolItem[] = actionTools.map((tool) => ({
    ...tool,
  }));
  intelligentTools: ToolItem[] = intelligentTools.map((tool) => ({
    ...tool,
  }));

  onToolClick(tool: ToolItem) {
    // tool.disabled = !tool.disabled;
    tool.inactive = !tool.inactive;
    if (tool.name === '智慧工具') {
      this.intelligentVisible.set(!tool.inactive);
      return;
    }
    this.setEffectVisibility.emit(tool);
  }

  onIntelligentToolClick(tool: ToolItem) {
    tool.inactive = false;
    this.actionTools.find((t) => t.name === '智慧工具')!.inactive = true;
    this.intelligentVisible.set(false);
    this.setEffectVisibility.emit(tool);
  }
}
