import { Component, computed, input, output, signal } from '@angular/core';
import { NzIconModule } from 'ng-zorro-antd/icon';

@Component({
  selector: 'function-overlay-select',
  imports: [NzIconModule],
  templateUrl: './select.component.html',
  styleUrl: './select.component.less',
})
export class FunctionOverlaySelectComponent {
  dropDownVisible = signal(false);
  multiple = input(true);
  placeholder = input<string>('请选择');
  selectAllLabel = input<string>('全部');
  value = input<any>([]);
  options = input<Option[]>([]);

  onChange = output<any>();

  isAllChecked = computed(() => {
    const options = this.options();
    const values = this.value();
    if (values.length === 0) return false;
    return options.every((option) => {
      return values.includes(option.value);
    });
  });

  isItemChecked(op: Option) {
    if (!this.multiple()) {
      return this.value() === op.value;
    }
    return this.value().includes(op.value);
  }
  // isAllChecked = signal(false);

  label = computed<string>(() => {
    if (this.multiple()) return this.placeholder();
    const selected = this.value();
    if (selected === null) return this.placeholder();
    return this.options().find((o) => o.value === selected)?.label ?? '';
  });

  toggleDropDown() {
    this.dropDownVisible.set(!this.dropDownVisible());
  }

  onSelectAllClick() {
    this.onChange.emit(
      this.isAllChecked() ? [] : this.options().map((o) => o.value),
    );
  }

  onOptionClick(op: Option) {
    if (this.multiple()) {
      const values = this.value();
      if (values.includes(op.value)) {
        this.onChange.emit(values.filter((v) => v !== op.value));
      } else {
        this.onChange.emit([...values, op.value]);
      }
    } else {
      this.onChange.emit(op.value);
      this.toggleDropDown();
    }
  }
}
