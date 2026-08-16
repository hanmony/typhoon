import { Component } from '@angular/core';
import { ExtremeSelectComponent } from '../../../common.component/extreme-select/extreme-select.component';
import { PatrollingDetailComponent } from '../../dispatch-center/simulated-patrolling/patrolling-detail/patrolling-detail.component';

@Component({
  selector: 'dashboard-patrolling-detail',
  imports: [ExtremeSelectComponent],
  templateUrl: './patrolling-detail.component.html',
  styleUrl: './patrolling-detail.component.less',
})
export class DashboardPatrollingDetailComponent extends PatrollingDetailComponent {}
