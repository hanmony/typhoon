import { Component, EventEmitter, Input, Output } from '@angular/core';
import { LibraryNzModule } from '../../../../library.nz.module';
import { ComposeOption } from '../../case-detail.component';
import { FilterCategory } from '../filter-modal.component';

@Component({
  selector: 'filter-category',
  imports: [LibraryNzModule],
  templateUrl: './filter-category.component.html',
  styleUrl: './filter-category.component.less',
})
export class FilterCategoryComponent {
  @Input() category!: FilterCategory;
  @Output() onChange = new EventEmitter<ComposeOption>();
  @Output() onAllChange = new EventEmitter();

  toggleItem(op: ComposeOption) {
    if (op.disabled) return;
    this.onChange.emit(op);
  }
  toggleAll() {
    this.onAllChange.emit();
  }
  get isAllChecked() {
    if (this.category.model.every((option) => option.disabled)) {
      return false;
    }
    return !!this.category.model
      .filter((option) => !option.disabled)
      .every((option) => option.checked);
  }
}
