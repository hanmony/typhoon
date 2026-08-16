import { Component, input } from '@angular/core';
import { verticalInOut } from '../../../../common.animation';

@Component({
  selector: 'duty-shortage-overlay',
  imports: [],
  templateUrl: './duty-shortage-overlay.component.html',
  styleUrl: './duty-shortage-overlay.component.less',
  animations: [verticalInOut],
})
export class DutyShortageOverlayComponent {
  visible = input.required<boolean>();
  isRemote = input.required<boolean>();
  shortageCards = [
    {
      number: 3,
      position: '衡山路站',
    },
    {
      number: 3,
      position: '衡山路站',
    },
    {
      number: 3,
      position: '一大会址·黄陂南路站',
    },
  ];
}
