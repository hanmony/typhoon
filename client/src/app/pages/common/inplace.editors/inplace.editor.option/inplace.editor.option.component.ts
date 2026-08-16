import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonNzModule } from '../../../../common.nz.module';
import { InplaceEditorShellComponent } from '../inplace.editor.shell/inplace.editor.shell.component';
import { InplaceValueChangedArgs } from '../inplace.value.changed.args';

@Component({
  selector: 'app-inplace-editor-option',
  imports: [CommonNzModule, InplaceEditorShellComponent],
  templateUrl: './inplace.editor.option.component.html',
  styleUrl: './inplace.editor.option.component.less',
})
export class InplaceEditorOptionComponent {
  constructor() {}

  @Input() obj?: unknown;
  @Input() readonly = false;
  @Input() value?: string = '';
  @Input() property: string = '';
  @Input() options: string[] = [];
  @Output() changed = new EventEmitter<InplaceValueChangedArgs<string>>();

  editingValue: string = '';

  startEdit() {
    this.editingValue = this.value ?? '';
  }

  save() {
    this.changed.emit({
      key: this.property,
      value: this.editingValue,
      obj: this.obj,
    });
  }
}
