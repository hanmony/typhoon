import { Component, ElementRef, input, signal, ViewChild } from '@angular/core';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { Subscription } from 'rxjs';
import { verticalInOut } from '../../../../common.animation';
import {
  ComparePoint,
  CompareStateItem,
  TyphoonCompareService,
} from '../typhoon.compare.service';
import { PointComponent } from './point/point.component';

@Component({
  selector: 'ds-compare-timeline',
  imports: [PointComponent, NzIconModule],
  templateUrl: './compare-timeline.component.html',
  styleUrl: './compare-timeline.component.less',
  animations: [verticalInOut],
})
export class CompareTimelineComponent {
  @ViewChild('contentRef') contentRef!: ElementRef<HTMLDivElement>;
  visible = input.required<boolean>();

  timelines = signal<
    {
      id: string;
      points: ComparePoint[];
      state: CompareStateItem;
      color: string;
    }[]
  >([]);
  changeSubscription?: Subscription;
  constructor(private compareService: TyphoonCompareService) {
    this.changeSubscription =
      this.compareService.compareChangeSubject$.subscribe(() => {
        this.timelines.set(
          this.compareService.currentExistState().map((s) => ({
            id: s.id,
            points: s.comparingPoints || [],
            color: s.color,
            state: s,
          })),
        );
      });
  }

  isActive(
    timeline: { id: string; state: CompareStateItem; color: string },
    point: ComparePoint,
  ) {
    return timeline.state.selectedPoint?.key === point.key;
  }
  onSelectedChange(
    timeline: { id: string; state: CompareStateItem },
    point: ComparePoint,
  ) {
    const state = this.compareService.state.find((s) => s.id === timeline.id);
    if (state) {
      this.compareService.setCurrentPointOnView(state, point);
    }
  }

  onArrowClick(direction: 'left' | 'right') {
    const container = this.contentRef.nativeElement;
    const scrollLeft = container.scrollLeft;
    const clientWidth = container.clientWidth;
    if (direction === 'left') {
      container.scrollTo({
        left: scrollLeft - clientWidth,
        behavior: 'smooth',
      });
    } else {
      container.scrollTo({
        left: scrollLeft + clientWidth,
        behavior: 'smooth',
      });
    }
  }

  isTileMode(name: string) {
    const points = this.timelines().find((t) => t.id === name)?.points || [];
    return points.length < 10;
  }

  isOverflowMode(name: string) {
    const points = this.timelines().find((t) => t.id === name)?.points || [];
    return points.length >= 10;
  }

  cancelComparing(id: string) {
    this.compareService.cancelComparing(id);
  }
  toggleVisible(id: string) {
    this.compareService.toggleVisible(id);
  }
}
