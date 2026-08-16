import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonNzModule } from '../../../../common.nz.module';
import { InplaceEditorShellComponent } from '../inplace.editor.shell/inplace.editor.shell.component';
import { InplaceValueChangedArgs } from '../inplace.value.changed.args';

@Component({
  selector: 'app-inplace-editor-datetime',
  imports: [CommonNzModule, InplaceEditorShellComponent],
  templateUrl: './inplace.editor.datetime.component.html',
  styleUrl: './inplace.editor.datetime.component.less',
})
export class InplaceEditorDatetimeComponent {
  @Input() obj?: unknown;
  @Input() readonly = false;
  @Input() value?: Date = new Date();
  @Input() property: string = '';
  @Input() format = 'yyyy-MM-dd HH:mm:ss';
  @Input() showTime = true;
  @Output() changed = new EventEmitter<InplaceValueChangedArgs<Date>>();

  editingValue = new Date();

  startEdit() {
    this.editingValue = this.value ?? new Date();
  }

  save() {
    this.changed.emit({
      key: this.property,
      value: this.editingValue,
      obj: this.obj,
    });
  }
}
