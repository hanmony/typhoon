import {
  Component,
  computed,
  ElementRef,
  input,
  output,
  signal,
  SimpleChanges,
  ViewChild,
} from '@angular/core';

export interface DesktopSelectOption {
  name: string;
  color?: string;
  icon?: string;
}

@Component({
  selector: 'desktop-select',
  imports: [],
  templateUrl: './desktop-select.component.html',
  styleUrl: './desktop-select.component.less',
})
export class DesktopSelectComponent {
  @ViewChild('innerContainer') innerContainer!: ElementRef<HTMLDivElement>;
  @ViewChild('outerContainer') outerContainer!: ElementRef<HTMLDivElement>;

  options = input<DesktopSelectOption[]>([]);
  value = input<string | number>('');
  onChange = output<string | number>();

  optionsContainerWidth = signal(708);
  currentPageIndex = signal(0);
  leftArrayVisible = computed(() => {
    return this.currentPageIndex() > 0 && this.options().length > 4;
  });
  rightArrayVisible = computed(() => {
    return this.currentPageIndex() * 4 < this.options().length - 4;
  });

  ngOnChanges(changes: SimpleChanges) {
    if (changes['options']) {
      this.currentPageIndex.set(0);
    }
  }

  ngAfterViewInit() {
    // this.leftArrayVisible.set(this.options.length > 4);
    // this.rightArrayVisible.set(this.options.length > 4);
  }

  onOptionClick(value: string | number) {
    this.onChange.emit(value);
  }

  onLeftArrowClick() {
    if (this.leftArrayVisible()) {
      this.currentPageIndex.update((index) => index - 1);
    }
  }

  getInnerTransform() {
    return `translateX(${this.currentPageIndex() * (102 - this.optionsContainerWidth())}px)`;
  }

  onRightArrowClick() {
    if (this.rightArrayVisible()) {
      this.currentPageIndex.update((index) => index + 1);
    }
  }

  getGradualHideBoolean(index: number) {
    return (
      index < this.currentPageIndex() * 4 ||
      index >= (this.currentPageIndex() + 1) * 4
    );
  }
}
