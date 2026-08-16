import {
  Component,
  EventEmitter,
  HostBinding,
  HostListener,
  Input,
  Output,
  SimpleChanges,
} from '@angular/core';
import { LOCAL_EVENT_KEYS_MAP } from '../../services/utils.service';
import { NormalPointComponent } from '../normal-point/normal-point.component';
import { Period, Timing } from '../timeline.component';

@Component({
  selector: 'timeline-period',
  imports: [NormalPointComponent],
  templateUrl: './period.component.html',
  styleUrl: './period.component.less',
})
export class PeriodComponent {
  @Input() disabled = false;
  @Input() selectedTiming?: Timing;
  @Input() autoPlaying: boolean = false;
  @Input() autoPlayTime: string = '';
  @Input() data?: Period;
  @Output() onSelect = new EventEmitter<Timing>();
  @Output() onExpand = new EventEmitter<Period>();

  @HostBinding('class')
  class: string = 'grid-cols-3';

  @HostBinding('style')
  style: string = '';
  constructor() {}
  ngAfterViewInit() {}
  ngOnChanges(changes: SimpleChanges) {
    if (changes['data']) {
      const length = this.data?.timings?.length || 0;
      if (length && length > 1) {
        this.class =
          'flex-1 max-w-[190px] grid grid-cols-' +
          (length > 3 ? '3 cursor-pointer hover-border' : length);
      } else {
        this.class = 'block';
      }
      this.style = `min-width: ${Math.min(length, 3) * 34}px;`;
    }
    if (changes['disabled']) {
      const length = this.data?.timings?.length || 0;
      if (length && length > 1) {
        if (this.disabled && this.class.indexOf('cursor-pointer') !== -1) {
          this.class = this.class.replace('cursor-pointer', 'cursor-auto');
        }
        if (!this.disabled && this.class.indexOf('cursor-auto') !== -1) {
          this.class = this.class.replace('cursor-auto', 'cursor-pointer');
        }
      }
    }
  }
  @HostListener('click', ['$event'])
  onClick(event: MouseEvent) {
    if (this.disabled) return;
    if (this.data!.timings.length <= 3) {
      return;
    }
    event.stopPropagation();
    this.onExpand.emit(this.data);
  }
  onPointClick(t: Timing) {
    if (this.data!.timings.length > 3) {
      return;
    }
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
  get points() {
    return (this.data?.timings || []).slice(0, 3);
  }
  get isKeyPeriod() {
    const len = this.data?.timings.length || 0;
    if (len <= 3) return false;
    return this.data?.timings.some((e) => e.isKey);
  }
}
