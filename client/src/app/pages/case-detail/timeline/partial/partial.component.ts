import {
  Component,
  ElementRef,
  EventEmitter,
  Input,
  Output,
} from '@angular/core';
import { LOCAL_EVENT_KEYS_MAP } from '../../services/utils.service';
import { AlertPointComponent } from '../alert-point/alert-point.component';
import { NormalPointComponent } from '../normal-point/normal-point.component';
import { Point, Timing } from '../timeline.component';

@Component({
  selector: 'timeline-partial',
  imports: [AlertPointComponent, NormalPointComponent],
  templateUrl: './partial.component.html',
  styleUrl: './partial.component.less',
  host: {
    class: 'flex h-full',
  },
})
export class PartialComponent {
  @Input() availableWidth = 0;
  @Input() autoPlaying = false;
  @Input() autoPlayTime: string = '';
  @Input() sliceTimeStrings: string[] = [];
  @Input() timings: Timing[] = [];
  @Input() start?: Point;
  @Input() end?: Point;
  @Input() selectedTiming?: Timing;
  @Output() onSelect = new EventEmitter<Timing>();

  constructor(private elRef: ElementRef) {}

  get width() {
    if (!this.availableWidth) return 0;
    return this.availableWidth - 140;
  }
  onTimingSelect(t: Timing) {
    this.onSelect.emit(t);
  }
  normalPointShouldBorder(timing: Timing): boolean {
    if (
      timing.events.some((e) =>
        LOCAL_EVENT_KEYS_MAP.map((k) => k[1]).includes(e.category),
      )
    ) {
      return true;
    }
    return false;
  }
  trackInView(t: Timing | null) {
    const index = this.timings.findIndex((p) => p === t);
    const dom = document.querySelector(`#partial-timing-${index}`);
    dom?.scrollIntoView({
      behavior: 'smooth',
      block: 'end',
    });
  }
  isSliceLeft(p: Point) {
    return p.timing.startTime === this.sliceTimeStrings[0];
  }
  isEndpointSliceLeft(t: string) {
    return t === this.sliceTimeStrings[0];
  }
  isEndpointSliceRight(t: string) {
    return t === this.sliceTimeStrings[1];
  }
  isSliceRight(p: Point) {
    return p.timing.startTime === this.sliceTimeStrings[1];
  }
}
