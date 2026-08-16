import {
  animate,
  state,
  style,
  transition,
  trigger,
} from '@angular/animations';
import { Component, computed, input, output, signal } from '@angular/core';
import { verticalInOut } from '../../../common.animation';

@Component({
  selector: 'supervisor-action-overlay',
  imports: [],
  templateUrl: './action-overlay.component.html',
  styleUrl: './action-overlay.component.less',
  animations: [
    verticalInOut,
    trigger('zoomInOut', [
      state(
        'in',
        style({ transform: 'translate(0, 0%) scale(1)', opacity: 1 }),
      ),
      transition('void => *', [
        style({ opacity: 0, transform: 'translate(0, 35%) scale(0)' }),
        animate('200ms cubic-bezier(0.35, 0, 0.25, 1)'),
      ]),
      transition('* => void', [
        animate(
          '200ms cubic-bezier(0.35, 0, 0.25, 1)',
          style({ opacity: 0, transform: 'translate(0, 35%) scale(0)' }),
        ),
      ]),
    ]),
  ],
})
export class ActionOverlayComponent {
  isHide = input<boolean>(false);
  actions = input<{ name: string; key: string }[]>([
    // {
    //   name: '智慧工具',
    //   key: 'intelligent-tool',
    // },
    // {
    //   name: '事件列表',
    //   key: 'event-statistic',
    // },
    // {
    //   name: '停运状况',
    //   key: 'stop-operation',
    {
      name: '线路筛选',
      key: 'line-filter',
    },
    // },
    {
      name: '态势面板',
      key: 'dashboard-panel',
    },
    {
      name: '重点事件',
      key: 'focus-event',
    },
  ]);
  intelligentSubActions = [
    {
      name: '模拟巡道',
      icon: 'assets/images/supervisor/patrolling-icon.png',
      key: 'simulate-patrolling',
      disabled: false,
    },
    {
      name: '暂无',
      icon: 'assets/images/supervisor/patrolling-icon.png',
      key: '2',
      disabled: true,
    },
    {
      name: '暂无',
      icon: 'assets/images/supervisor/patrolling-icon.png',
      key: '3',
      disabled: true,
    },
  ];
  activeAction = signal<string | null>(null);
  actionChange = output<string>();
  handleAction(key: string) {
    if (key === 'intelligent-tool') {
      this.toggleIntelligentTool();
      return;
    }
    this.actionChange.emit(key);
  }
  handleSubAction(item: { name: string; disabled: boolean }) {
    if (item.disabled) return;
    if (item.name === '模拟巡道') {
      this.toggleIntelligentTool();
      this.actionChange.emit('simulate-patrolling');
    }
  }
  toggleIntelligentTool() {
    if (this.activeAction() !== 'intelligent-tool') {
      this.activeAction.set('intelligent-tool');
    } else {
      this.activeAction.set(null);
    }
  }
  toggleEventStatisticTool() {
    if (this.activeAction() !== 'event-statistic') {
      this.activeAction.set('event-statistic');
    } else {
      this.activeAction.set(null);
    }
  }

  isIntelligentTool = computed(() => {
    return this.activeAction() === 'intelligent-tool';
  });
}
