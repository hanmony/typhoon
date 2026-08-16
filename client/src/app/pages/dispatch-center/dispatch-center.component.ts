import { Component, signal, ViewChild } from '@angular/core';
import 'proj4leaflet';
import { TyphoonNameComponent } from '../../common.component/typhoon-name/typhoon-name.component';
import { environment } from '../../../environments/environment';
import {
  DashboardFilterState,
  getInitialDashboardState,
} from '../dispatch-dashboard/dashboard-map/action-overlay/action-overlay.component';
import { DashboardMapComponent } from '../dispatch-dashboard/dashboard-map/dashboard-map.component';
import { DashboardPanelComponent } from '../dispatch-dashboard/dashboard-panel/dashboard-panel.component';
import { DispatchLeftPanelComponent } from './left-panel/left-panel.component';
import { DispatchCenterMapComponent } from './map/map.component';
import { DispatchRightPanelComponent } from './right-panel/right-panel.component';
import { DispatchSharedComponent } from './shared.dispatch';
import { DcSimulatedPatrollingComponent } from './simulated-patrolling/simulated-patrolling.component';

@Component({
  selector: 'app-dispatch-center',
  imports: [
    DispatchCenterMapComponent,
    DispatchLeftPanelComponent,
    DispatchRightPanelComponent,
    DcSimulatedPatrollingComponent,
    TyphoonNameComponent,
    // DispatchTopActionComponent,
    DashboardMapComponent,
    DashboardPanelComponent,
  ],
  templateUrl: './dispatch-center.component.html',
  styleUrl: './dispatch-center.component.less',
})
/**
 * 调度指挥台
 */
export class DispatchCenterComponent extends DispatchSharedComponent {
  hideTitle = environment.hideTitle;
  @ViewChild(DispatchCenterMapComponent) mapRef!: DispatchCenterMapComponent;
  @ViewChild(DashboardPanelComponent) panelComponent!: DashboardPanelComponent;
  @ViewChild(DashboardMapComponent)
  dashboardMapComponent!: DashboardMapComponent;

  override locateEvent(ev: ExtremeOcc.Event) {
    this.mapRef?.locateEvent(ev);
  }

  dashboardVisible = signal(false);
  dashboardFilterState = signal<DashboardFilterState>(
    getInitialDashboardState(),
  );
  toDashboardWithState(withState: DashboardFilterState) {
    this.dashboardFilterState.set(withState);
    this.dashboardVisible.set(true);
  }
  closeDashboard() {
    this.dashboardVisible.set(false);
  }

  followTypeChange(type: string) {
    this.panelComponent.onTypeChange(type);
  }

  openPatrollingLine(line: string) {
    this.dashboardMapComponent?.openPatrollingDetail(line);
  }
}
