import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { EmergencyWarningComponent } from './emergency-warning/emergency-warning.component';
import { FloodControlMeasuresComponent } from './flood-control-measures/flood-control-measures.component';
import { TyphoonImpactsTableComponent } from './typhoon-impacts-table/typhoon-impacts-table.component';

@Component({
  selector: 'app-typhoon-measures',
  standalone: true,
  imports: [
    CommonModule,
    FloodControlMeasuresComponent,
    TyphoonImpactsTableComponent,
    EmergencyWarningComponent,
  ],
  templateUrl: './typhoon-measures.component.html',
  styleUrls: ['./typhoon-measures.component.less'],
})
export class TyphoonMeasuresComponent {
  activeComponent: 'flood-control' | 'typhoon-impacts' | 'emergency-warning' =
    'flood-control';

  // 根据激活的组件返回对应的标题
  getCurrentComponentTitle(): string {
    switch (this.activeComponent) {
      case 'flood-control':
        return '防汛工作举措';
      case 'typhoon-impacts':
        return '主要影响台风汇总表';
      case 'emergency-warning':
        return '应急响应值守要求';
      default:
        return '防汛工作举措';
    }
  }

  switchToFloodControl(): void {
    this.activeComponent = 'flood-control';
  }

  switchToTyphoonImpacts(): void {
    this.activeComponent = 'typhoon-impacts';
  }

  switchToEmergencyWarning(): void {
    this.activeComponent = 'emergency-warning';
  }
}
