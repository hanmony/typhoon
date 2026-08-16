import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonNzModule } from '../../../../common.nz.module';

@Component({
  selector: 'app-inplace-editor-shell',
  imports: [CommonNzModule],
  templateUrl: './inplace.editor.shell.component.html',
  styleUrl: './inplace.editor.shell.component.less',
})
export class InplaceEditorShellComponent {
  @Input() readonly = false;
  @Output() onSave: EventEmitter<void> = new EventEmitter<void>();
  @Output() onEdit: EventEmitter<void> = new EventEmitter<void>();

  editing = false;

  startEdit() {
    if (this.readonly) {
      return;
    }
    this.editing = true;
    this.onEdit.emit();
  }

  cancel() {
    this.editing = false;
  }

  save() {
    this.onSave.emit();
    this.editing = false;
  }
}
