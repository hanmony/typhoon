import { Component, computed, effect, input, signal } from '@angular/core';
import { CommonNzModule } from './../../../common.nz.module';
import { OccEventStatisticsComponent } from './event-statistics/event-statistics.component';
import { OccGuardRepairComponent } from './guard-repair/guard-repair.component';
import { OccLineOperationComponent } from './line-operation/line-operation.component';
import { OccWeatherInfoComponent } from './weather-info/weather-info.component';

@Component({
  selector: 'occ-right-panel',
  imports: [
    CommonNzModule,
    OccWeatherInfoComponent,
    OccEventStatisticsComponent,
    OccLineOperationComponent,
    OccGuardRepairComponent,
  ],
  templateUrl: './right-panel.component.html',
  styleUrl: './right-panel.component.less',
})
export class OccRightPanelComponent {
  collapse = signal(false);
  isHide = input<boolean>(false);

  events = input<ExtremeOcc.Event[]>([]);
  operations = input<ExtremeOcc.Operation[]>([]);

  constructor() {
    effect(() => {
      this.collapse.set(this.isHide());
    });
  }

  toggleCollapse() {
    this.collapse.set(!this.collapse());
  }

  tabs = [
    {
      label: '事件统计',
      key: 'event-statistics',
    },
    {
      label: '线路运营',
      key: 'line-operation',
    },
    {
      label: '抢修统计',
      key: 'repair-statistics',
    },
  ];
  activeTab = signal(this.tabs[0].key);
  activeTabLabel = computed(
    () => this.tabs.find((tab) => tab.key === this.activeTab())?.label,
  );
  setActiveTab(key: string) {
    this.activeTab.set(key);
  }
}
