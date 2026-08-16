import { Component, input, output, signal } from '@angular/core';
import {
  horizontalInOut,
  horizontalInOutReverse,
} from '../../../common.animation';
import {
  PatrollingLineListComponent,
  PatrollingStatistic,
} from './line-list/line-list.component';
import { PatrollingDetailComponent } from './patrolling-detail/patrolling-detail.component';

@Component({
  selector: 'dc-simulated-patrolling',
  imports: [PatrollingLineListComponent, PatrollingDetailComponent],
  templateUrl: './simulated-patrolling.component.html',
  styleUrl: './simulated-patrolling.component.less',
  animations: [horizontalInOut, horizontalInOutReverse],
})
export class DcSimulatedPatrollingComponent {
  onClose = output<void>();
  visible = input(false);
  detailPageVisible = signal(false);
  initialDetailLine = signal('');

  openDetailPage(line: string) {
    this.initialDetailLine.set(line);
    this.detailPageVisible.set(true);
  }
  closeDetailPage() {
    this.detailPageVisible.set(false);
  }

  toDetail(line: PatrollingStatistic) {
    this.openDetailPage(line.name);
  }
}
