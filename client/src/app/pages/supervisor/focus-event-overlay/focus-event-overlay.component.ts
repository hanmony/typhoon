import {
  Component,
  computed,
  effect,
  ElementRef,
  input,
  output,
  signal,
  ViewChild,
  ViewContainerRef,
} from '@angular/core';
import { verticalInOut } from '../../../common.animation';
import { repairStateTextMap } from '../../occ/occ.const';

@Component({
  selector: 'supervisor-focus-event-overlay',
  imports: [],
  templateUrl: './focus-event-overlay.component.html',
  styleUrl: './focus-event-overlay.component.less',
  animations: [verticalInOut],
})
export class FocusEventOverlayComponent {
  @ViewChild('innerContainer') innerContainer?: ElementRef<HTMLDivElement>;
  @ViewChild('outerContainer') outerContainer?: ElementRef<HTMLDivElement>;

  locateEvent = output<ExtremeOcc.Event>();

  events = input<ExtremeOcc.Event[]>([]);
  normalEvents = computed(() => {
    return this.events().filter((ev) => !ev.severity);
  });
  severityEvents = computed(() => {
    return this.events().filter((ev) => ev.severity);
  });
  severityCount = computed(() => {
    return this.severityEvents().length;
  });
  normalCount = computed(() => {
    return this.normalEvents().length;
  });
  urgentRepairEvents = computed(() => {
    return this.events().filter((ev) => ev.urgentRepair);
  });
  urgentRepairCount = computed(() => {
    return this.urgentRepairEvents().length;
  });

  getEventLabel(ev: ExtremeOcc.Event) {
    return ev.eventType === '其他事件' ? ev.otherEvent : ev.eventType;
  }
  getEventPosition(ev: ExtremeOcc.Event) {
    switch (ev.locationType) {
      case '站点':
      case '车场':
        return [ev.startStation];
      case '区间':
        return [ev.startStation, '-', ev.endStation];
      case '自定义':
        return ev.customPosition.split(', ');
      default:
        return [];
    }
  }
  getEventState(ev: ExtremeOcc.Event) {
    if (!ev.urgentRepair) return '';
    return repairStateTextMap[ev.urgentRepairStatus] || '未处置';
  }
  getEventStateColorClass(ev: ExtremeOcc.Event) {
    if (!ev.urgentRepair) return '';
    //   0: '未处置',
    // 1: '抢修中',
    // 2: '已结束',
    switch (ev.urgentRepairStatus) {
      case 0:
        return 'pending';
      case 1:
        return 'doing';
      case 2:
        return 'finished';
      default:
        return '';
    }
  }

  width = input<number>(196 + 6);
  directorVisible = false;
  leftVisible = false;
  rightVisible = false;
  cacheLength = 0;

  scrollLock = signal<boolean>(false);
  constructor(private viewContainerRef: ViewContainerRef) {
    effect(() => {
      const length = this.events().length;
      this.checkLength(length);
    });
  }

  ngAfterViewInit() {
    this.setDirectorVisible();
  }

  handleLocate(ev: ExtremeOcc.Event) {
    this.locateEvent.emit(ev);
  }

  setDirectorVisible() {
    setTimeout(() => {
      if (!this.outer) return;
      if (this.outer.scrollWidth > this.outer.offsetWidth) {
        this.directorVisible = true;
        this.rightVisible = true;
      }
    });
  }

  handleScroll(direction: 'left' | 'right') {
    if (!this.outer) return;
    if (this.scrollLock()) return;
    this.scrollLock.set(true);
    const scrollLeft =
      direction === 'left'
        ? this.outer.scrollLeft - this.width() * 4 + 1
        : this.outer.scrollLeft + this.width() * 4 - 1;
    this.outer.scrollTo({
      left: scrollLeft,
      behavior: 'smooth',
    });
    setTimeout(() => {
      this.checkSingleVisible();
      this.scrollLock.set(false);
    }, 600);
  }
  checkSingleVisible() {
    if (!this.outer) return;
    const { scrollWidth, scrollLeft, clientWidth } = this.outer;
    this.rightVisible = clientWidth + scrollLeft <= scrollWidth - 2;
    this.leftVisible = scrollLeft > 0;
    this.directorVisible = this.rightVisible || this.leftVisible;
  }
  checkLength(length: number) {
    if (length !== this.cacheLength) {
      this.cacheLength = length;
      this.outer?.scrollTo({
        left: 0,
        behavior: 'smooth',
      });
      setTimeout(() => {
        this.checkSingleVisible();
      }, 500);
    }
  }

  get dom() {
    return this.viewContainerRef.element.nativeElement;
  }
  get container() {
    return this.innerContainer?.nativeElement;
  }
  get outer() {
    return this.outerContainer?.nativeElement;
  }
}
