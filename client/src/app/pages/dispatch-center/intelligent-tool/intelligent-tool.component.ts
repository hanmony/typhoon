import { Component, output, signal } from '@angular/core';
import { ModuleHeaderComponent } from '../module-header/module-header.component';

@Component({
  selector: 'dc-intelligent-tool',
  imports: [ModuleHeaderComponent],
  templateUrl: './intelligent-tool.component.html',
  styleUrl: './intelligent-tool.component.less',
})
export class IntelligentToolComponent {
  toggleSimulatedPatrolling = output<void>();

  tools = signal([
    {
      id: 1,
      name: '模拟巡道',
      status: 'normal',
      icon: 'assets/images/dispatch-center/intelligent-tool/patrolling.png',
    },
    // {
    //   id: 2,
    //   name: '智慧工具2',
    //   status: 'normal',
    //   icon: 'assets/images/dispatch-center/intelligent-tool/tool-2.png',
    // },
    // {
    //   id: 3,
    //   name: '智慧工具3',
    //   status: 'normal',
    //   icon: 'assets/images/dispatch-center/intelligent-tool/tool-3.png',
    // },
  ]);

  onToolClick(tool: { name: string }) {
    switch (tool.name) {
      case '模拟巡道':
        this.toggleSimulatedPatrolling.emit();
        break;
      default:
        console.warn('未实现该工具的功能');
        break;
    }
  }
}
