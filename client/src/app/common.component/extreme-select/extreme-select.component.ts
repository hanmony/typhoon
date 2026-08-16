import {
  Component,
  EventEmitter,
  HostListener,
  Input,
  Output,
} from '@angular/core';
import { NzIconModule } from 'ng-zorro-antd/icon';

@Component({
  selector: 'extreme-select',
  imports: [NzIconModule],
  templateUrl: './extreme-select.component.html',
  styleUrl: './extreme-select.component.less',
})
export class ExtremeSelectComponent<T = any> {
  dropDownVisible = false;
  @Input() dropUp = false;
  @Input() isSupervisor = false;
  @Input() disabled = false;
  @Input() multiple = false;
  @Input() placeholder = '请选择';
  @Input() selectAllLabel = '全部';

  @Input() value: T | T[] = [];
  @Input() options: Option<T>[] = [];

  @Output() onChange = new EventEmitter<T | T[]>();

  @HostListener('click', ['$event'])
  onClick(event: MouseEvent) {
    if (this.disabled) return;
    event.stopPropagation;
    this.toggleDropDown();
  }

  isAllChecked() {
    const options = this.options;
    const values = this.value;
    if ((values as T[]).length === 0) return false;
    return options.every((option) => {
      return (values as T[]).includes(option.value);
    });
  }

  isItemChecked(op: Option<T>) {
    if (this.disabled) return;
    if (!this.multiple) {
      return this.value === op.value;
    }
    return (this.value as T[]).includes(op.value);
  }
  // isAllChecked = signal(false);

  get label() {
    if (this.multiple) return this.placeholder;
    const selected = this.value;
    if (selected === null || selected === '') return this.placeholder;
    return this.options.find((o) => o.value === selected)?.label ?? '';
  }

  toggleDropDown() {
    this.dropDownVisible = !this.dropDownVisible;
  }

  onSelectAllClick() {
    if (this.disabled) return;
    this.onChange.emit(
      this.isAllChecked() ? [] : this.options.map((o) => o.value),
    );
  }

  onOptionClick(op: Option<T>) {
    if (this.multiple) {
      const values = this.value as T[];
      if (values.includes(op.value)) {
        this.onChange.emit(values.filter((v) => v !== op.value));
      } else {
        this.onChange.emit([...values, op.value]);
      }
      this.toggleDropDown();
    } else {
      this.onChange.emit(op.value);
    }
  }
}
