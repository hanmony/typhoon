import { Component, ElementRef, inject, output, signal } from '@angular/core';

@Component({
  selector: 'supervisor-notification-dom',
  imports: [],
  templateUrl: './notification-dom.component.html',
  styleUrl: './notification-dom.component.css',
  // animations: [scaleInOut],
})
export class NotificationDomComponent {
  private el = inject(ElementRef);
  toList = output<void>();
  visible = signal(false);
  deleting = signal(false);
  tipText = signal('');

  timer?: NodeJS.Timeout;

  toggle() {
    if (this.visible()) {
      const target = this.el.nativeElement.querySelector('.wrapper-box');
      target.addEventListener('transitionend', () => this.hide());
      this.deleting.set(true);
    } else {
      this.visible.update((visible) => !visible);
      this.deleting.set(false);
    }
  }

  tip(text: string) {
    this.tipText.set(text);
    this.toggle();
    this.timer = setTimeout(() => {
      this.toggle();
    }, 5000);
  }

  hide() {
    this.visible.set(false);
    this.deleting.set(false);
    this.tipText.set('');
    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = undefined;
    }
  }

  clear() {
    if (this.visible()) {
      this.toggle();
    }
  }
}
