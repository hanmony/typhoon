import { Component, Input, OnInit } from '@angular/core';
import { NzMessageService } from 'ng-zorro-antd/message';
import { NzUploadChangeParam } from 'ng-zorro-antd/upload';
import { CommonNzModule } from '../../../../common.nz.module';
import { CaseDto } from '../../../../domain/case.dto';
import { PathInfoDto } from '../../../../domain/path.info.dto';
import { RolesInDirective } from '../../../../middlewares/roles.in.directive';
import { ApiService } from '../../../../services/api.service';

@Component({
  selector: 'app-editor-path-info',
  imports: [CommonNzModule, RolesInDirective],
  templateUrl: './editor.path.info.component.html',
  styleUrl: './editor.path.info.component.less',
})
export class EditorPathInfoComponent implements OnInit {
  constructor(
    private readonly messages: NzMessageService,
    private readonly api: ApiService,
  ) {}

  @Input() doc?: CaseDto;
  loading = false;
  items: PathInfoDto[] = [];

  ngOnInit(): void {
    this.fetchItems();
  }

  handleImportStatusChange(info: NzUploadChangeParam) {
    if (info.file.status === 'done') {
      this.messages.success('上传完成');
      this.fetchItems();
    } else if (info.type === 'error') {
      this.messages.error('上传失败:' + info.file.error.error.message);
    }
  }

  private async fetchItems() {
    this.loading = true;
    await this.api.manager
      .getPathInfos(this.doc!.name)
      .then((items) => (this.items = items))
      .finally(() => (this.loading = false));
  }
}
