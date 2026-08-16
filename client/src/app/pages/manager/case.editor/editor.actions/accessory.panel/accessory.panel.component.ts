import { Component, Input } from '@angular/core';
import { NzMessageService } from 'ng-zorro-antd/message';
import { NzUploadChangeParam } from 'ng-zorro-antd/upload';
import { environment as baseConfig } from '../../../../../../environments/environment';
import { CommonNzModule } from '../../../../../common.nz.module';
import { ActionAccessoryDto } from '../../../../../domain/action.accessory.dto';
import { ActionDto } from '../../../../../domain/action.dto';
import { CaseDto } from '../../../../../domain/case.dto';
import { ApiService } from '../../../../../services/api.service';

@Component({
  selector: 'app-accessory-panel',
  imports: [CommonNzModule],
  templateUrl: './accessory.panel.component.html',
  styleUrl: './accessory.panel.component.less',
})
export class AccessoryPanelComponent {
  constructor(
    private readonly api: ApiService,
    private readonly messages: NzMessageService,
  ) {}

  @Input() caseData!: CaseDto;
  @Input() action!: ActionDto;
  loading = false;
  readonly baseUrl = baseConfig.baseUrl;

  async handleDelete(item: ActionAccessoryDto) {
    this.loading = true;
    this.action.accessories = await this.api.manager
      .deleteAccessory(this.action._id, item.filename)
      .finally(() => (this.loading = false));
  }

  getDownloadUrl(item: ActionAccessoryDto): string {
    return `${this.baseUrl}/manager/editor/download-accessory?filename=${item.filename}`;
  }

  handleChange(info: NzUploadChangeParam): void {
    if (info.file.status !== 'uploading') {
      // console.log(info.file, info.fileList);
    }
    if (info.file.status === 'done') {
      this.messages.success(`${info.file.name} 上传完成`);
      this.action.accessories = info.file.response;
    } else if (info.file.status === 'error') {
      this.messages.error(`${info.file.name} 上传失败.`);
    }
  }
}
