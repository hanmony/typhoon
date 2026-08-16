import {
  Component,
  ElementRef,
  EventEmitter,
  Input,
  Output,
  signal,
  SimpleChanges,
  ViewChild,
  ViewContainerRef,
} from '@angular/core';
import { linesData2026 } from '../../../case-detail/services/meta';
import {
  DashboardFilterState,
  getInitialDashboardState,
} from '../../../dispatch-dashboard/dashboard-map/action-overlay/action-overlay.component';
import { occEventCategories } from '../../../occ/occ.const';
import { ModuleHeaderComponent } from './../../../dispatch-center/module-header/module-header.component';
import { DualLineChartComponent } from './dual-line-chart/dual-line-chart.component';

const colors = [
  '#FFAC26',
  '#BAE7FF',
  '#1EE7E7',
  '#2F54EB',
  '#74A0C2',
  '#1890FF',
];

@Component({
  selector: 'ds-line-data-module',
  imports: [ModuleHeaderComponent, DualLineChartComponent],
  templateUrl: './line-data-module.component.html',
  styleUrl: './line-data-module.component.less',
})
export class DsLineDataModuleComponent {
  @ViewChild('innerContainer') innerContainer!: ElementRef<HTMLDivElement>;
  @ViewChild('outerContainer') outerContainer!: ElementRef<HTMLDivElement>;

  @Input() events: ExtremeOcc.Event[] = [];
  @Output() toDashboardWithState = new EventEmitter<DashboardFilterState>();

  width = signal<number>(379);
  directorVisible = false;
  leftVisible = false;
  rightVisible = false;

  scrollLock = signal<boolean>(false);

  lines = linesData2026.map((l) => {
    return {
      name: l.name,
      total: 0,
      events: occEventCategories.map((ev, i) => ({
        name: ev.label,
        value: 0,
        color: colors[i],
      })),
    };
  });

  constructor(private viewContainerRef: ViewContainerRef) {}

  ngAfterViewInit() {
    this.width.set(this.outer.offsetWidth / 3);
    this.setDirectorVisible();
    this.autoScroll();
  }
  autoScrollTimer?: NodeJS.Timeout;
  autoScroll() {
    if (this.rightVisible) {
      this.handleScroll('right');
    } else if (this.leftVisible) {
      this.revertLeft();
    }
    this.autoScrollTimer = setTimeout(() => {
      this.autoScroll();
    }, 5000);
  }

  ngOnChanges(changes: SimpleChanges) {
    if (changes['events']) {
      this.resetChartData();
      this.checkSingleVisible();
    }
  }
  resetChartData() {
    const evs = this.events.filter((ev) => !!ev.isShow);

    this.lines = linesData2026.map((l) => {
      const cEvs = evs.filter((e) => e.line === l.name);
      return {
        name: l.name,
        total: cEvs.length,
        events: occEventCategories.map((cat, i) => ({
          name: cat.label,
          value: cEvs.filter((e) => cat.contains.includes(e.eventType)).length,
          color: colors[i],
        })),
      };
    });
  }

  setDirectorVisible() {
    setTimeout(() => {
      if (this.outer.scrollWidth > this.outer.offsetWidth) {
        this.directorVisible = true;
        this.rightVisible = true;
      }
    });
  }

  manualScroll(direction: 'left' | 'right') {
    if (this.autoScrollTimer) {
      clearTimeout(this.autoScrollTimer);
    }
    this.handleScroll(direction);
    this.autoScrollTimer = setTimeout(() => {
      this.autoScroll();
    }, 5000);
  }

  handleScroll(direction: 'left' | 'right') {
    if (this.scrollLock()) return;
    this.scrollLock.set(true);
    const scrollLeft =
      direction === 'left'
        ? this.outer.scrollLeft - this.width() * 3.001
        : this.outer.scrollLeft + this.width() * 3.001;
    this.outer.scrollTo({
      left: scrollLeft,
      behavior: 'smooth',
    });
    setTimeout(() => {
      this.checkSingleVisible();
      this.scrollLock.set(false);
    }, 500);
  }
  revertLeft() {
    this.outer.scrollTo({
      left: 0,
      behavior: 'smooth',
    });
    setTimeout(() => {
      this.checkSingleVisible();
    }, 500);
  }
  checkSingleVisible() {
    if (!this.outer) return;
    const { scrollWidth, scrollLeft, clientWidth } = this.outer;
    this.rightVisible = clientWidth + scrollLeft < scrollWidth;
    this.leftVisible = scrollLeft > 0;
  }

  toDashboard(line: string) {
    const state = getInitialDashboardState();
    this.toDashboardWithState.emit({
      ...state,
      type: 'event',
      line: [line],
    });
  }

  get dom() {
    return this.viewContainerRef.element.nativeElement;
  }
  get container() {
    return this.innerContainer.nativeElement;
  }
  get outer() {
    return this.outerContainer?.nativeElement;
  }
}
