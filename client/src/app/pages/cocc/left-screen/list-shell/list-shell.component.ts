import { CommonModule } from '@angular/common';
import { Component, input, output } from '@angular/core';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { horizontalInOut } from '../../../../common.animation';

@Component({
  selector: 'cocc-list-shell',
  imports: [CommonModule, NzIconModule],
  templateUrl: './list-shell.component.html',
  styleUrl: './list-shell.component.less',
  animations: [horizontalInOut],
})
export class CoccListShellComponent {
  visible = input(false);
  isHide = input(false);
  titleText = input('');

  onAdd = output<void>();

  tableActionVisible = input(false);
  onTable = output<void>();

  onPlusClick() {
    this.onAdd.emit();
  }
}
