import { Component, Input, OnInit } from '@angular/core';
import { NzMessageService } from 'ng-zorro-antd/message';
import { NzUploadChangeParam } from 'ng-zorro-antd/upload';
import { environment as baseConfig } from '../../../../../environments/environment';
import { CommonNzModule } from '../../../../common.nz.module';
import { CaseDocMetaDto } from '../../../../domain/case.doc.meta.dto';
import { CaseDto, CaseStatus } from '../../../../domain/case.dto';
import { ApiService } from '../../../../services/api.service';

@Component({
  selector: 'app-editor-doc',
  imports: [CommonNzModule],
  templateUrl: './editor.doc.component.html',
  styleUrl: './editor.doc.component.less',
})
export class EditorDocComponent implements OnInit {
  constructor(
    private readonly apis: ApiService,
    private readonly messages: NzMessageService,
  ) {}

  loading = false;
  @Input() doc?: CaseDto;
  items: CaseDocMetaDto[] = [];
  readonly baseUrl = baseConfig.baseUrl;

  get readonly() {
    if (!this.doc) {
      return true;
    }
    return this.doc.status != CaseStatus.editing;
  }

  ngOnInit(): void {
    this.fetchDoc();
  }

  async fetchDoc() {
    if (!this.doc) {
      return;
    }
    this.loading = true;
    this.apis.manager
      .getDocs(this.doc._id)
      .then((docs) => (this.items = docs))
      .finally(() => (this.loading = false));
  }

  handleDeleteDoc(item: CaseDocMetaDto) {
    this.loading = true;
    this.apis.manager.deleteDoc(item.caseId, item.filename).then(() => {
      this.messages.success('删除成功');
      this.fetchDoc();
    });
  }

  handleImportStatusChange(info: NzUploadChangeParam) {
    if (info.file.status === 'done') {
      this.messages.success('上传完成');
      this.fetchDoc();
    } else if (info.type === 'error') {
      this.messages.error('上传失败:' + info.file.error.message);
    }
  }
}
