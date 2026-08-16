import { Component, ElementRef, Input, SimpleChanges } from '@angular/core';

@Component({
  selector: 'timeline-normal-point',
  imports: [],
  host: {
    style: 'display: inline-block;',
  },
  templateUrl: './normal-point.component.html',
  styleUrl: './normal-point.component.less',
})
export class NormalPointComponent {
  @Input() active: boolean = false;
  @Input() disabled: boolean = false;
  @Input() static: boolean = false;
  @Input() isKey: boolean = false;
  @Input() border: boolean = false;
  @Input() blink: boolean = false;
  @Input() ban: boolean = false;

  constructor(private eleRef: ElementRef<HTMLDivElement>) {}
  get icon() {
    if (this.disabled) {
      return this.disabledIcon;
    }
    if (this.active) {
      return this.activeIcon;
    }
    return this.defaultIcon;
  }
  get disabledIcon() {
    return `assets/images/map/timeline/disable-normal-point.png`;
  }
  get activeIcon() {
    return `assets/images/map/timeline/normal-point-active.png`;
  }
  get defaultIcon() {
    return `assets/images/map/timeline/normal-point.png`;
  }
  ngOnChanges(changes: SimpleChanges) {
    if (changes['blink']) {
      if (this.blink) {
        setTimeout(() => {
          this.scrollToView();
        });
      }
    }
  }
  scrollToView() {
    this.eleRef.nativeElement.scrollIntoView({
      behavior: 'smooth',
      block: 'start',
    });
  }
}
