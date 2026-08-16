import { Component, signal, ViewChild } from '@angular/core';
import { LibraryNzModule } from '../../library.nz.module';
import { DispatchSharedComponent } from '../dispatch-center/shared.dispatch';
import {
  DashboardFilterState,
  getInitialDashboardState,
} from './dashboard-map/action-overlay/action-overlay.component';
import { DashboardMapComponent } from './dashboard-map/dashboard-map.component';
import { DashboardPanelComponent } from './dashboard-panel/dashboard-panel.component';

@Component({
  selector: 'app-dispatch-dashboard',
  imports: [LibraryNzModule, DashboardMapComponent, DashboardPanelComponent],
  templateUrl: './dispatch-dashboard.component.html',
  styleUrl: './dispatch-dashboard.component.less',
})
export class DispatchDashboardComponent extends DispatchSharedComponent {
  @ViewChild(DashboardMapComponent) mapComponent!: DashboardMapComponent;
  @ViewChild(DashboardPanelComponent) panelComponent!: DashboardPanelComponent;

  type = signal('event');
  dashboardFilterState = signal<DashboardFilterState>(
    getInitialDashboardState(),
  );

  override ngOnInit(): void {
    this.validateCommandPlatform();
    this.validateDispatchCenterAuth();
    this.activatedRoute.queryParams.subscribe((params) => {
      const type = params['type'];
      if (type === 'event' || type === 'operation') {
        this.onTypeChange(type);
      }
    });
  }

  onTypeChange(type: string) {
    this.type.set(type);
    this.mapComponent.afterTypeChange(type);
    this.panelComponent.onTypeChange(type);
  }
  closeDashboard() {}
  openPatrollingLine(line: string) {
    this.mapComponent.openPatrollingDetail(line);
  }
}
