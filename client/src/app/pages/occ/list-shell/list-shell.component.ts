import { CommonModule } from '@angular/common';
import { Component, input } from '@angular/core';
import { horizontalInOutReverse } from '../../../common.animation';

@Component({
  selector: 'occ-list-shell',
  imports: [CommonModule],
  templateUrl: './list-shell.component.html',
  styleUrl: './list-shell.component.less',
  animations: [horizontalInOutReverse],
})
export class OccListShellComponent {
  animation = input(true);
  visible = input(false);
  isHide = input(false);
  titleText = input('');
}
