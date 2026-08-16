import {
  animate,
  state,
  style,
  transition,
  trigger,
} from '@angular/animations';
import { Component } from '@angular/core';
import { LibraryNzModule } from '../../../library.nz.module';

@Component({
  selector: 'autoplay-countdown',
  imports: [LibraryNzModule],
  templateUrl: './countdown.component.html',
  styleUrl: './countdown.component.less',
  animations: [
    trigger('shark', [
      state('in', style({ transform: 'scale(1)', opacity: 1 })),
      transition('void => *', [
        style({ opacity: 0, transform: 'scale(3)' }),
        animate('500ms linear'),
      ]),
      transition('* => void', [
        animate('500ms linear', style({ opacity: 0, transform: 'scale(1)' })),
      ]),
    ]),
  ],
})
export class AutoPlayCountdownComponent {
  // currentCount = -1; // 3, 2, 1
  visible: boolean = false;
  timer?: NodeJS.Timeout;
  startCountdown(callback: (t: NodeJS.Timeout) => void) {
    this.visible = true;
    this.timer = setTimeout(() => {
      this.visible = false;
      callback(this.timer!);
    }, 3000);
  }
  terminateCountdown() {
    this.visible = false;
    clearTimeout(this.timer);
  }
  ngAfterViewInit() {
    // this.startCountdown(() => {});
  }
}
