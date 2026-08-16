import {
  animate,
  state,
  style,
  transition,
  trigger,
} from '@angular/animations';
import { Component, EventEmitter, Input, Output } from '@angular/core';

@Component({
  selector: 'timeline-wind-circle',
  imports: [],
  templateUrl: './wind-circle.component.html',
  styleUrl: './wind-circle.component.less',
  host: {
    class: 'cursor-pointer whitespace-nowrap flex items-center',
  },
  animations: [
    trigger('fade', [
      state('in', style({ opacity: 1 })),
      transition('void => *', [style({ opacity: 0 }), animate(200)]),
      transition('* => void', [animate(200, style({ opacity: 0 }))]),
    ]),
  ],
})
export class WindCircleComponent {
  @Input() hidden = true;
  @Output() click = new EventEmitter();
}
