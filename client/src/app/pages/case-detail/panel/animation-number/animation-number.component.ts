import { Component, Input, SimpleChanges } from '@angular/core';
import { horizontalInOutRelative } from '../../../../common.animation';

@Component({
  selector: 'panel-animation-number',
  imports: [],
  templateUrl: './animation-number.component.html',
  styleUrl: './animation-number.component.less',
  animations: [horizontalInOutRelative],
})
export class AnimationNumberComponent {
  @Input() value: number = 0;
  currentValue = 0;
  diff = 0;
  ngOnChanges(changes: SimpleChanges) {
    if (changes['value']) {
      if (!this.value) {
        this.currentValue = 0;
        this.diff = 0;
      } else {
        this.diff = this.value - this.currentValue;

        setTimeout(() => {
          this.currentValue = this.value;
          this.diff = 0;
        }, 600);
      }
    }
  }
}
