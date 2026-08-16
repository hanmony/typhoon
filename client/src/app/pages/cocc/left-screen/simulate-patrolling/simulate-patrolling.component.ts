import { Component, output, signal, ViewChild } from '@angular/core';
import {
  horizontalInOut,
  horizontalInOutReverse,
} from '../../../../common.animation';
import { PatrollingStatistic } from '../../../dispatch-center/simulated-patrolling/line-list/line-list.component';
import { PatrollingLineListComponent } from './../../../dispatch-center/simulated-patrolling/line-list/line-list.component';
import { CoccPatrollingDetailComponent } from './patrolling-detail/patrolling-detail.component';

@Component({
  selector: 'cocc-simulate-patrolling',
  imports: [PatrollingLineListComponent, CoccPatrollingDetailComponent],
  templateUrl: './simulate-patrolling.component.html',
  styleUrl: './simulate-patrolling.component.less',
  animations: [horizontalInOut, horizontalInOutReverse],
})
export class CoccSimulatePatrollingComponent {
  @ViewChild(CoccPatrollingDetailComponent)
  detail?: CoccPatrollingDetailComponent;

  onLocationQuery = output<boolean>();
  showMessage = output<string>();
  removeMessage = output();

  onClose = output<void>();

  detailPageVisible = signal(false);
  initialDetailLine = signal('');

  openDetailPage(line: string) {
    this.initialDetailLine.set(line);
    this.detailPageVisible.set(true);
  }
  closeDetailPage() {
    this.detailPageVisible.set(false);
    this.removeMessage.emit();
  }

  toDetail(line: PatrollingStatistic) {
    this.openDetailPage(line.name);
  }
}
