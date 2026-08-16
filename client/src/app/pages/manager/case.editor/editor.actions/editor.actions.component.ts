import { Component, Input, OnDestroy, OnInit } from '@angular/core';
import { isEmpty } from 'lodash-es';
import { NzMessageService } from 'ng-zorro-antd/message';
import { Subject, debounceTime, takeUntil } from 'rxjs';
import { CommonNzModule } from '../../../../common.nz.module';
import { ActionCategory } from '../../../../domain/action.category';
import { ActionDto } from '../../../../domain/action.dto';
import { CaseDto, CaseStatus } from '../../../../domain/case.dto';
import { ApiService } from '../../../../services/api.service';
import { InplaceEditorDatetimeComponent } from '../../../common/inplace.editors/inplace.editor.datetime/inplace.editor.datetime.component';
import { InplaceEditorStringComponent } from '../../../common/inplace.editors/inplace.editor.string/inplace.editor.string.component';
import { InplaceValueChangedArgs } from '../../../common/inplace.editors/inplace.value.changed.args';
import { AccessoryPanelComponent } from './accessory.panel/accessory.panel.component';

@Component({
  selector: 'app-editor-actions',
  imports: [
    CommonNzModule,
    AccessoryPanelComponent,
    InplaceEditorDatetimeComponent,
    InplaceEditorStringComponent,
  ],
  templateUrl: './editor.actions.component.html',
  styleUrl: './editor.actions.component.less',
})
export class EditorActionsComponent implements OnDestroy, OnInit {
  constructor(
    private readonly api: ApiService,
    private readonly messages: NzMessageService,
  ) {
    this.refresh$
      .pipe(takeUntil(this.destroy$), debounceTime(500))
      .subscribe(() => {
        this.fetchItems();
      });
  }

  @Input() get doc(): CaseDto | undefined {
    return this._doc;
  }
  set doc(value: CaseDto | undefined) {
    this._doc = value;
    this.refresh$.next();
  }

  category: ActionCategory = ActionCategory.alert;
  columns: string[] = [];
  items: ActionDto[] = [];
  loading = false;
  expandSet = new Set<string>();

  get readonly() {
    if (!this.doc) {
      return true;
    }
    return this.doc.status != CaseStatus.editing;
  }

  hasAccessory(item: ActionDto) {
    return !isEmpty(item.accessories);
  }

  readonly allCategories = Object.values(ActionCategory).filter(
    (i) => i != ActionCategory.unknown && i != ActionCategory.config,
  );
  readonly refresh$ = new Subject<void>();

  private readonly destroy$ = new Subject<void>();
  private _doc?: CaseDto;

  ngOnInit(): void {
    this.refresh$.next();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  onExpandChange(id: string, checked: boolean): void {
    if (checked) {
      this.expandSet.add(id);
    } else {
      this.expandSet.delete(id);
    }
  }

  async handleChanged(args: InplaceValueChangedArgs) {
    this.loading = true;
    await this.api.manager
      .updateActionProperty({
        id: (args.obj as any)._id,
        property: args.key,
        value: args.value,
      })
      .then(() => {
        if (args.key == '开始时间' || args.key == '结束时间') {
          (args.obj as any)[args.key] = args.value;
        } else {
          (args.obj as any).items[args.key] = args.value;
        }
        this.messages.info('属性已更新');
      })
      .finally(() => (this.loading = false));
  }

  private async fetchItems(): Promise<void> {
    this.loading = true;
    this.items = await this.api.manager
      .getEvents(this.doc!._id, this.category)
      .finally(() => (this.loading = false));
    const keyset = new Set<string>();
    for (const item of this.items) {
      Object.getOwnPropertyNames(item.items).forEach((i) => keyset.add(i));
    }
    this.columns = Array.from(keyset).filter(
      (i) => i != '开始时间' && i != '结束时间',
    );
  }
}
