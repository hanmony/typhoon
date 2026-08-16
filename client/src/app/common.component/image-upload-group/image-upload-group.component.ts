import { Component, Input } from '@angular/core';
import { NzMessageService } from 'ng-zorro-antd/message';
import { NzUploadChangeParam, NzUploadFile } from 'ng-zorro-antd/upload';
import { CommonNzModule } from '../../common.nz.module';
import { ApiService } from '../../services/api.service';

const getBase64 = (file: File): Promise<string | ArrayBuffer | null> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result);
    reader.onerror = (error) => reject(error);
  });

@Component({
  selector: 'image-upload-group',
  standalone: true,
  imports: [CommonNzModule],
  templateUrl: './image-upload-group.component.html',
  styleUrl: './image-upload-group.component.less',
})
export class ImageUploadGroupComponent {
  uploading = false;
  @Input() fileList: NzUploadFile[] = [];

  previewImage: string | undefined = '';
  previewVisible = false;
  constructor(
    private message: NzMessageService,
    private api: ApiService,
  ) {}

  handlePreview = async (file: NzUploadFile): Promise<void> => {
    if (!file.url && !file['preview']) {
      file['preview'] = await getBase64(file.originFileObj!);
    }
    this.previewImage = file.url || file['preview'];
    this.previewVisible = true;
  };
  handleImportStatusChange(event: NzUploadChangeParam) {
    if (event.type === 'start') {
      this.uploading = true;
    }
    if (event.type === 'success') {
      if (event.file.response?.code !== 0) {
        this.message.error('上传失败: ' + event.file.response?.message);
        this.uploading = false;
        return;
      }
      this.message.success('上传成功');
      this.uploading = false;
    } else if (event.type === 'error') {
      if (event.file.error.error?.message) {
        this.message.error('上传失败: ' + event.file.error.error.message);
      } else {
        this.message.error('上传失败');
      }
      this.uploading = false;
    }
  }

  onFileListChange(event: NzUploadFile[]) {
    this.fileList = event;
  }
  onFileRemove = (file: NzUploadFile) => {
    // from(this.api.knowledge.removeDoc(Number(file.uid))).pipe(
    //   tap(res => {
    //     if (res.code === 0) {
    //       this.fileList = this.fileList.filter(f => f.uid !== file.uid);
    //     }
    //     return true;
    //   }),
    //   map(res => res.code === 0)
    // );
    this.fileList = this.fileList.filter((f) => f.uid !== file.uid);
    return true;
  };
  // pushFile(doc: Knowledge.Doc) {
  //   this.fileList.push({
  //     uid: doc.id.toString(),
  //     name: doc.name,
  //     status: 'done',
  //     url: doc.url,
  //     preview: doc.url,
  //   });
  // }
  get urls(): string[] {
    return this.fileList
      .map((e) => {
        const resUrl = e.response?.message;
        return resUrl ? resUrl : e.url;
      })
      .filter(Boolean);
  }
  get uploadEndpoint() {
    return '/uploadFile/upload';
  }
}
