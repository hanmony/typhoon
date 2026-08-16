import {
  Component,
  ElementRef,
  signal,
  SimpleChanges,
  ViewChild,
  ViewContainerRef,
} from '@angular/core';
import { linesData2026 } from '../../../case-detail/services/meta';
import { occEventTypes } from '../../../occ/occ.const';
import { ModuleHeaderComponent } from './../../../dispatch-center/module-header/module-header.component';
import { DualLineChartComponent } from './dual-line-chart/dual-line-chart.component';

const colors = ['#1890FF', '#1EE7E7', '#2F54EB', '#BAE7FF', '#FFAC26'];

@Component({
  selector: 'cocc-line-data-module',
  imports: [ModuleHeaderComponent, DualLineChartComponent],
  templateUrl: './line-data-module.component.html',
  styleUrl: './line-data-module.component.less',
})
export class LineDataModuleComponent {
  @ViewChild('innerContainer') innerContainer!: ElementRef<HTMLDivElement>;
  @ViewChild('outerContainer') outerContainer!: ElementRef<HTMLDivElement>;

  width = signal<number>(379);
  directorVisible = false;
  leftVisible = false;
  rightVisible = false;

  scrollLock = signal<boolean>(false);

  lines = linesData2026.map((l) => {
    return {
      name: l.name,
      events: occEventTypes.map((ev, i) => ({
        name: ev,
        value: Math.floor(Math.random() * 300),
        color: colors[i],
      })),
    };
  });

  constructor(private viewContainerRef: ViewContainerRef) {}

  ngAfterViewInit() {
    this.width.set(this.outer.offsetWidth / 3);
    this.setDirectorVisible();
  }

  ngOnChanges(changes: SimpleChanges) {
    if (changes['data']) {
      this.checkSingleVisible();
    }
  }

  setDirectorVisible() {
    setTimeout(() => {
      if (this.outer.scrollWidth > this.outer.offsetWidth) {
        this.directorVisible = true;
        this.rightVisible = true;
      }
    });
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
  checkSingleVisible() {
    if (!this.outer) return;
    const { scrollWidth, scrollLeft, clientWidth } = this.outer;
    this.rightVisible = clientWidth + scrollLeft < scrollWidth;
    this.leftVisible = scrollLeft > 0;
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
