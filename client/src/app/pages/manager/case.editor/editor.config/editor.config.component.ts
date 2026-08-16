import { Component, Input, OnInit } from '@angular/core';
import { groupBy } from 'lodash-es';
import { CommonNzModule } from '../../../../common.nz.module';
import {
  CaseConfigItem,
  CaseDto,
  CaseStatus,
} from '../../../../domain/case.dto';
import { ApiService } from '../../../../services/api.service';
import { InplaceEditorOptionComponent } from '../../../common/inplace.editors/inplace.editor.option/inplace.editor.option.component';
import { InplaceEditorStringComponent } from '../../../common/inplace.editors/inplace.editor.string/inplace.editor.string.component';
import { InplaceValueChangedArgs } from '../../../common/inplace.editors/inplace.value.changed.args';

class GroupedConfigItem {
  name: string = '';
  items: CaseConfigItem[] = [];
}

@Component({
  selector: 'app-editor-config',
  imports: [
    CommonNzModule,
    InplaceEditorStringComponent,
    // InplaceEditorNumComponent,
    // InplaceEditorDatetimeComponent,
    InplaceEditorOptionComponent,
  ],
  templateUrl: './editor.config.component.html',
  styleUrl: './editor.config.component.less',
})
export class EditorConfigComponent implements OnInit {
  constructor(private readonly api: ApiService) {}

  @Input() doc!: CaseDto;

  loading: boolean = false;

  get readonly() {
    if (!this.doc) {
      return true;
    }
    return this.doc.status != CaseStatus.editing;
  }

  groupItems: GroupedConfigItem[] = [];

  ngOnInit(): void {
    const groups = groupBy(Array.from(Object.values(this.doc.values)), 'type');
    const groupNames = Object.keys(groups);
    this.groupItems = [];
    for (const name of groupNames) {
      this.groupItems.push({
        name: name,
        items: groups[name] as CaseConfigItem[],
      });
    }
  }

  async applyChanges(kv: InplaceValueChangedArgs) {
    if (!this.doc) {
      return;
    }
    this.loading = true;
    await this.api.manager
      .updateCaseProperty({
        id: this.doc._id,
        property: kv.key,
        value: kv.value,
      })
      .then(() => {
        this.doc.values[kv.key as keyof CaseDto].value = String(kv.value);
      })
      .finally(() => (this.loading = false));
  }
}
