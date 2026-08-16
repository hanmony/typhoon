import { Component, EventEmitter, Input, Output } from '@angular/core';
import { NzSafeAny } from 'ng-zorro-antd/core/types';
import { NzThAddOnComponent } from 'ng-zorro-antd/table';
import { CommonNzModule } from '../../../common.nz.module';

@Component({
  standalone: true,
  selector: 'th-string-filter',
  templateUrl: './table.string.filter.component.html',
  styleUrls: ['./table.string.filter.component.less'],
  imports: [CommonNzModule],
})
export class TableStringFilterComponent {
  constructor() {}

  visible = false;
  @Input() th?: NzThAddOnComponent<NzSafeAny>;
  @Input() showValue = true;
  @Input() placeholder = '请输入';
  @Input() value?: string;
  @Output() valueChange = new EventEmitter<string>();

  get isActived(): boolean {
    return this.value != undefined && this.value != '';
  }

  onVisibleChanged(visible: boolean) {
    if (!visible) {
      const value = (this.value ?? '').trim();
      this.valueChange.emit(value);
      this.th?.onFilterValueChange(value);
    }
  }
}
