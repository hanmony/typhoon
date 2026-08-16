import { Component, output, signal } from '@angular/core';
import {
  horizontalInOut,
  horizontalInOutReverse,
} from '../../../common.animation';
import {
  PatrollingLineListComponent,
  PatrollingStatistic,
} from '../../dispatch-center/simulated-patrolling/line-list/line-list.component';
import { PatrollingDetailComponent } from '../../dispatch-center/simulated-patrolling/patrolling-detail/patrolling-detail.component';

@Component({
  selector: 'supervisor-patrolling-overlay',
  imports: [PatrollingLineListComponent, PatrollingDetailComponent],
  templateUrl: './patrolling-overlay.component.html',
  styleUrl: './patrolling-overlay.component.less',
  animations: [horizontalInOut, horizontalInOutReverse],
})
export class PatrollingOverlayComponent {
  onClose = output<void>();

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
