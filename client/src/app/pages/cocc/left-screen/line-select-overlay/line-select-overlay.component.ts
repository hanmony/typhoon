import {
  Component,
  ElementRef,
  input,
  output,
  signal,
  ViewChild,
  ViewContainerRef,
} from '@angular/core';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { linesData2026 } from '../../../case-detail/services/meta';

@Component({
  selector: 'cocc-line-select-overlay',
  imports: [NzIconModule],
  templateUrl: './line-select-overlay.component.html',
  styleUrl: './line-select-overlay.component.less',
})
export class LineSelectOverlayComponent {
  @ViewChild('innerContainer') innerContainer!: ElementRef<HTMLDivElement>;
  @ViewChild('outerContainer') outerContainer!: ElementRef<HTMLDivElement>;

  change = output<string[]>();

  lines = signal(
    linesData2026.map((l) => ({
      name: l.name,
      checked: true,
    })),
  );

  // allChecked = computed(() => this.lines().every((l) => l.checked));
  allChecked = signal(true);

  handleAction(line: { name: string; checked: boolean }) {
    line.checked = !line.checked;
    this.updateAllChecked();
    this.change.emit(
      this.lines()
        .filter((l) => l.checked)
        .map((l) => l.name),
    );
  }

  handleCheckAll() {
    if (this.lines().some((l) => l.checked)) {
      this.lines().forEach((l) => (l.checked = false));
    } else {
      this.lines().forEach((l) => (l.checked = true));
    }
    this.updateAllChecked();
    this.change.emit(
      this.lines()
        .filter((l) => l.checked)
        .map((l) => l.name),
    );
  }
  updateAllChecked() {
    this.allChecked.set(this.lines().every((l) => l.checked));
  }

  width = input<number>(143 + 16);
  directorVisible = false;
  leftVisible = false;
  rightVisible = false;

  scrollLock = signal<boolean>(false);
  constructor(private viewContainerRef: ViewContainerRef) {}

  ngAfterViewInit() {
    this.setDirectorVisible();
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
        ? this.outer.scrollLeft - this.width() * 5.01
        : this.outer.scrollLeft + this.width() * 5.01;
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
    return this.outerContainer.nativeElement;
  }
}
