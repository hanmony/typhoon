import {
  animate,
  state,
  style,
  transition,
  trigger,
} from '@angular/animations';
import { Component, HostListener, input, output } from '@angular/core';

@Component({
  selector: 'function-overlay-checkbox',
  imports: [],
  templateUrl: './checkbox.component.html',
  styleUrl: './checkbox.component.less',
  host: {
    class: 'cursor-pointer whitespace-nowrap inline-flex items-center',
  },
  animations: [
    trigger('fade', [
      state('in', style({ opacity: 1 })),
      transition('void => *', [style({ opacity: 0 }), animate(200)]),
      transition('* => void', [animate(200, style({ opacity: 0 }))]),
    ]),
  ],
})
export class FunctionOverlayCheckboxComponent {
  label = input('');
  checked = input(false);
  onChange = output<boolean>();

  @HostListener('click')
  onClick() {
    this.onChange.emit(!this.checked());
  }
}
