// document.list.component.ts
import { Component, OnInit } from '@angular/core';
import { NzMessageService } from 'ng-zorro-antd/message';
import { NzModalService } from 'ng-zorro-antd/modal';
import { NzUploadChangeParam, NzUploadFile } from 'ng-zorro-antd/upload';
import { CommonNzModule } from '../../../common.nz.module';
import { ApiService } from '../../../services/api.service';
import {
  AddDigitalPlanRequest,
  contingencyPlan,
  DigitalPlanListRequest,
  RemoveDigitalPlanRequest,
} from '../../../services/apis/contingencyPlan';

interface Document {
  fileName: string;
  uploadTime: string;
  id: string; // 添加id字段
}

// 定义与实际API返回数据匹配的接口
interface ApiDocument {
  id: string;
  url: string;
  createdAt: string;
  updatedAt: string;
  status: number;
  name?: string; // 可能不存在
}

interface ApiDocumentResponse {
  list: ApiDocument[];
  total: number;
}

@Component({
  selector: 'app-pdf.list',
  imports: [CommonNzModule],
  templateUrl: './document.list.component.html',
  styleUrl: './document.list.component.less',
})
export class DocumentListComponent implements OnInit {
  documents: Document[] = [];
  total = 0;
  loading = false;
  pageIndex = 1;
  pageSize = 8; // 默认每页展示8条数据
  isImportModalVisible = false;
  uploading = false;
  fileList: NzUploadFile[] = [];
  selectedDate: Date | null = null;
  uploadedFiles: Array<{ url: string; name: string }> = []; // 存储上传成功的URL和文件名

  constructor(
    private readonly api: ApiService,
    private readonly messages: NzMessageService,
    private readonly modal: NzModalService,
    private readonly contingencyPlanService: contingencyPlan,
  ) {}

  ngOnInit(): void {
    this.loadDocuments();
  }

  async loadDocuments(): Promise<void> {
    this.loading = true;

    try {
      // 构造请求参数
      const params: DigitalPlanListRequest = {
        page: this.pageIndex,
        pageSize: this.pageSize,
      };

      // 调用接口
      const response: any =
        await this.contingencyPlanService.getDigitalPlanList(params as any);

      const apiResponse = response as ApiDocumentResponse;

      this.documents = apiResponse.list.map((item) => ({
        fileName:
          item.name || this.extractFileNameFromUrl(item.url) || '未知文件',
        uploadTime:
          item.createdAt || item.updatedAt || new Date().toISOString(),
        id: item.id, // 添加id字段
      }));

      this.total = apiResponse.total;
    } catch (error) {
      console.error('加载文档失败:', error);
      this.messages.error('加载文档失败: ' + (error as Error).message);
    } finally {
      this.loading = false;
    }
  }

  // 辅助方法：从URL中提取文件名
  private extractFileNameFromUrl(url: string): string {
    try {
      const urlObj = new URL(url, window.location.origin);
      const pathname = urlObj.pathname;
      const fileName = pathname.substring(pathname.lastIndexOf('/') + 1);
      if (fileName) return decodeURIComponent(fileName);
    } catch (e) {
      const parts = url.split('/');
      if (parts.length > 0) return parts[parts.length - 1];
    }
    return '';
  }

  onPageIndexChange(pageIndex: number): void {
    this.pageIndex = pageIndex;
    this.loadDocuments();
  }

  onPageSizeChange(pageSize: number): void {
    this.pageSize = pageSize;
    this.pageIndex = 1; // 重置到第一页
    this.loadDocuments();
  }

  showImportModal(): void {
    this.isImportModalVisible = true;
  }

  handleImportModalOk(): void {
    this.handleConfirm();
  }

  handleImportModalCancel(): void {
    this.isImportModalVisible = false;
    this.fileList = [];
    this.selectedDate = null;
    this.uploadedFiles = [];
  }

  // 添加 beforeUpload 方法
  beforeUpload = (file: NzUploadFile): boolean => {
    return true;
  };

  // 处理文件上传变化
  handleUploadChange(event: NzUploadChangeParam): void {
    if (event.type === 'start') {
      this.uploading = true;
    }

    if (event.type === 'success') {
      this.uploading = false;
      if (event.file.response?.code !== 0) {
        this.messages.error('上传失败: ' + event.file.response?.message);
        return;
      }

      const url = event.file.response?.message;
      const name = event.file.name; // 原始文件名
      if (url && name) {
        this.uploadedFiles.push({ url, name });
      }
      this.messages.success('文件上传成功');
    } else if (event.type === 'error') {
      this.uploading = false;
      if (event.file.error?.message) {
        this.messages.error('上传失败: ' + event.file.error.message);
      } else {
        this.messages.error('上传失败');
      }
    }
  }

  onDateChange(date: Date): void {
    this.selectedDate = date;
  }

  async handleConfirm(): Promise<void> {
    if (!this.selectedDate) {
      this.messages.warning('请选择更新时间');
      return;
    }

    if (this.uploadedFiles.length === 0) {
      this.messages.warning('请先上传文件');
      return;
    }

    try {
      for (const file of this.uploadedFiles) {
        const params: AddDigitalPlanRequest = {
          name: file.name, // 添加文件名
          updatedTime: this.selectedDate.toISOString(),
          url: file.url,
        };

        await this.contingencyPlanService.addDigitalPlan(params);
      }

      this.messages.success('所有文件已成功保存');

      this.isImportModalVisible = false;
      this.fileList = [];
      this.selectedDate = null;
      this.uploadedFiles = [];

      this.loadDocuments();
    } catch (error) {
      this.messages.error('保存失败: ' + (error as Error).message);
    }
  }

  deleteDocument(id: string): void {
    this.modal.confirm({
      nzTitle: '确认删除',
      nzContent: '确定要删除这个文档吗？',
      nzOkText: '确定',
      nzCancelText: '取消',
      nzOnOk: async () => {
        try {
          const params: RemoveDigitalPlanRequest = {
            id: id,
          };
          const response =
            await this.contingencyPlanService.removeDigitalPlan(params);

          if (response.code === 0) {
            this.messages.success('删除成功');
            this.loadDocuments();
          } else {
            this.messages.error('删除失败: ' + response.message);
          }
        } catch (error) {
          this.messages.error('删除失败: ' + (error as Error).message);
        }
      },
    });
  }
}
