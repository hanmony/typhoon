import { Component, input } from '@angular/core';
import { verticalInOutRelative } from '../../../../common.animation';

@Component({
  selector: 'occ-error-tip',
  imports: [],
  templateUrl: './error-tip.component.html',
  styleUrl: './error-tip.component.less',
  animations: [verticalInOutRelative],
})
export class OccErrorTipComponent {
  message = input('');
}
