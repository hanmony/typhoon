import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonNzModule } from '../../../../common.nz.module';
import { InplaceEditorShellComponent } from '../inplace.editor.shell/inplace.editor.shell.component';
import { InplaceValueChangedArgs } from '../inplace.value.changed.args';

@Component({
  selector: 'app-inplace-editor-num',
  imports: [CommonNzModule, InplaceEditorShellComponent],
  templateUrl: './inplace.editor.num.component.html',
  styleUrl: './inplace.editor.num.component.less',
})
export class InplaceEditorNumComponent {
  @Input() obj?: unknown;
  @Input() readonly = false;
  @Input() value?: number = 0;
  @Input() property: string = '';
  @Output() changed = new EventEmitter<InplaceValueChangedArgs<number>>();

  editingValue: number = 0;

  startEdit() {
    this.editingValue = this.value ?? 0;
  }

  save() {
    this.changed.emit({
      key: this.property,
      value: this.editingValue,
      obj: this.obj,
    });
  }
}
