import { Component, ElementRef } from '@angular/core';
import { getAnimationFrame } from '../pages/case-detail/utils';

@Component({
  selector: '',
  imports: [],
  template: '',
  styles: '',
})
export class AutoScrollComponent<T extends HTMLElement = HTMLDivElement> {
  scrollContainer!: ElementRef<T>;
  autoScrollEnabled = false;
  scrollHeight = 256;
  scrollPosition = -50;
  beyondPosition = 100;
  fixHeight = 14 * 8;
  speed = 0.5;
  animationFrameTimer?: number;
  animationFrameFunc = getAnimationFrame();
  timerToContinue?: NodeJS.Timeout;

  ngAfterViewInit() {
    this.setScrollHeight();
    this.setFixHeight();
    this.setAutoScrollEnabled(true);
  }

  setFixHeight() {
    if (!this.scrollContainer?.nativeElement) return;
    this.fixHeight = this.scrollContainer.nativeElement.clientHeight;
  }

  setScrollHeight() {
    setTimeout(() => {
      if (!this.scrollContainer.nativeElement) return;
      this.scrollHeight = this.scrollContainer.nativeElement.scrollHeight;
    });
  }

  setAutoScrollEnabled(enabled: boolean) {
    this.autoScrollEnabled = enabled;
    if (enabled) {
      this.autoScroll();
    } else {
      this.stopScroll();
      this.clearAutoScrollTimer();
    }
  }

  autoScroll() {
    if (!this.autoScrollEnabled) return;
    // 防重入：已在滚动循环中时不再启动新循环，否则多次调用会叠加多份并发 RAF，
    // 每帧多次累加 scrollPosition，表现为滚动越来越快且无法停止。
    if (this.animationFrameTimer !== undefined) return;
    const tick = () => {
      if (!this.autoScrollEnabled) {
        this.animationFrameTimer = undefined;
        return;
      }
      if (!this.scrollContainer.nativeElement) {
        this.animationFrameTimer = this.animationFrameFunc(tick);
        return;
      }
      if (
        this.scrollPosition <
        this.scrollHeight - this.fixHeight + this.beyondPosition
      ) {
        this.scrollPosition += this.speed;
      } else {
        this.scrollPosition = -this.beyondPosition;
      }
      this.scrollContainer.nativeElement.scrollTop = this.scrollPosition;
      this.animationFrameTimer = this.animationFrameFunc(tick);
    };
    this.animationFrameTimer = this.animationFrameFunc(tick);
  }
  stopScroll() {
    if (this.animationFrameTimer !== undefined) {
      cancelAnimationFrame(this.animationFrameTimer);
      this.animationFrameTimer = undefined;
    }
  }
  clearAutoScrollTimer() {
    clearTimeout(this.timerToContinue);
    this.timerToContinue = undefined;
  }
  manuallyScroll() {
    this.stopScroll();
    this.clearAutoScrollTimer();
    this.timerToContinue = setTimeout(() => {
      this.autoScroll();
    }, 4000);
  }
  ngOnDestroy() {
    this.stopScroll();
    this.clearAutoScrollTimer();
  }
}
