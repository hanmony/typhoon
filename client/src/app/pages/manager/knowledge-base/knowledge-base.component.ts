import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { NzMessageService } from 'ng-zorro-antd/message';
import { NzModalService } from 'ng-zorro-antd/modal';
import { CommonNzModule } from '../../../common.nz.module';
import { KnowledgeBaseApi, KbDocument, ChunkConfig, FailedItem, GenerateAllMetadataResponse } from '../../../services/apis/knowledge-base';

interface ConfigForm {
  strategy: string;
  chunkSize: number;
  overlap: number;
}

@Component({
  selector: 'app-knowledge-base',
  imports: [CommonNzModule, FormsModule],
  templateUrl: './knowledge-base.component.html',
  styleUrl: './knowledge-base.component.less',
})
export class KnowledgeBaseComponent implements OnInit {
  documents: KbDocument[] = [];
  total = 0;
  page = 1;
  pageSize = 10;
  loading = false;

  uploading = false;
  uploadCategory = 'other';
  filterCategory: string | undefined = undefined;

  processingIds = new Set<string>();
  expandedConfigId: string | null = null;
  configForm: ConfigForm = { strategy: 'auto', chunkSize: 500, overlap: 50 };

  categoryOptions = [
    { value: 'typhoon_case', label: '台风历史案例' },
    { value: 'regulation', label: '防汛防台管理规定' },
    { value: 'emergency_plan', label: '应急预案' },
    { value: 'other', label: '其他' },
  ];

  categoryMap: Record<string, string> = {
    typhoon_case: '台风历史案例',
    regulation: '防汛防台管理规定',
    emergency_plan: '应急预案',
    other: '其他',
  };

  categoryPresetMap: Record<string, { strategy: string; chunkSize: number; overlap: number }> = {
    typhoon_case: { strategy: 'paragraph', chunkSize: 800, overlap: 80 },
    regulation: { strategy: 'paragraph', chunkSize: 500, overlap: 50 },
    emergency_plan: { strategy: 'paragraph', chunkSize: 600, overlap: 60 },
    other: { strategy: 'sliding_window', chunkSize: 500, overlap: 50 },
  };

  statusMap: Record<number, { label: string; color: string } | undefined> = {
    0: { label: '待处理', color: 'orange' },
    1: { label: '解析中', color: 'blue' },
    2: { label: '已分段', color: 'blue' },
    3: { label: '已入库', color: 'green' },
    [-1]: { label: '失败', color: 'red' },
    [-2]: { label: '元数据生成失败', color: 'orange' },
  };

  strategyOptions = [
    { value: 'auto', label: '自动（按分类）' },
    { value: 'paragraph', label: '段落式' },
    { value: 'sliding_window', label: '滑动窗口' },
  ];

  isEditingSummary = false;
  editingSummary = '';
  generating = false;

  batchGenerating = false;
  batchResultVisible = false;
  batchResult: GenerateAllMetadataResponse | null = null;

  get isAnyProcessing(): boolean {
    return this.processingIds.size > 0;
  }

  constructor(
    private readonly kbApi: KnowledgeBaseApi,
    private readonly message: NzMessageService,
    private readonly modal: NzModalService,
  ) {}

  ngOnInit() {
    this.loadDocuments();
  }

  async loadDocuments() {
    this.loading = true;
    try {
      const res = await this.kbApi.listDocuments({
        page: this.page,
        pageSize: this.pageSize,
        category: this.filterCategory,
      });
      this.documents = res.list;
      this.total = res.total;
    } catch (e) {
      this.message.error('加载文档列表失败');
    } finally {
      this.loading = false;
    }
  }

  async onUpload(file: File) {
    this.uploading = true;
    try {
      await this.kbApi.upload(file, this.uploadCategory);
      this.message.success('上传成功');
      this.loadDocuments();
    } catch (e) {
      this.message.error('上传失败: ' + (e as Error).message);
    } finally {
      this.uploading = false;
    }
    return false;
  }

  async onCategoryChange(doc: KbDocument, category: string) {
    try {
      await this.kbApi.updateCategory(doc._id, category);
      doc.category = category;
      this.message.success('分类已更新');
    } catch (e) {
      this.message.error('更新分类失败');
    }
  }

  onFilterCategoryChange(category: string | undefined) {
    this.filterCategory = category;
    this.page = 1;
    this.loadDocuments();
  }

  getConfigSummary(doc: KbDocument): string {
    if (doc.chunkConfig) {
      const s = doc.chunkConfig.strategy === 'paragraph' ? '段落式' : '滑动窗口';
      return `${s} ${doc.chunkConfig.chunkSize}/${doc.chunkConfig.overlap}`;
    }
    const preset = this.categoryPresetMap[doc.category || 'other'];
    const s = preset.strategy === 'paragraph' ? '段落式' : '滑动窗口';
    return `自动 ${s} ${preset.chunkSize}/${preset.overlap}`;
  }

  toggleConfigPanel(doc: KbDocument) {
    if (this.expandedConfigId === doc._id) {
      this.expandedConfigId = null;
      return;
    }
    this.expandedConfigId = doc._id;
    // 初始化表单
    if (doc.chunkConfig) {
      this.configForm = {
        strategy: doc.chunkConfig.strategy,
        chunkSize: doc.chunkConfig.chunkSize,
        overlap: doc.chunkConfig.overlap,
      };
    } else {
      const preset = this.categoryPresetMap[doc.category || 'other'];
      this.configForm = { strategy: 'auto', chunkSize: preset.chunkSize, overlap: preset.overlap };
    }
  }

  private getEffectiveConfig(): { strategy?: string; chunkSize?: number; overlap?: number } {
    return {
      strategy: this.configForm.strategy,
      chunkSize: this.configForm.chunkSize,
      overlap: this.configForm.overlap,
    };
  }

  async onProcess(doc: KbDocument) {
    this.processingIds.add(doc._id);
    try {
      await this.kbApi.processDocument(doc._id, this.getEffectiveConfig());
      this.message.success('处理完成');
      this.expandedConfigId = null;
      await this.loadDocuments();
    } catch (e) {
      this.message.error('处理失败: ' + (e as Error).message);
      await this.loadDocuments();
    } finally {
      this.processingIds.delete(doc._id);
    }
  }

  async onSaveConfig(doc: KbDocument) {
    try {
      await this.kbApi.saveChunkConfig(doc._id, {
        strategy: this.configForm.strategy,
        chunkSize: this.configForm.chunkSize,
        overlap: this.configForm.overlap,
      });
      this.message.success('配置已保存，文档已标记为待处理');
      this.expandedConfigId = null;
      await this.loadDocuments();
    } catch (e) {
      this.message.error('保存失败: ' + (e as Error).message);
    }
  }

  onReProcess(doc: KbDocument) {
    this.modal.confirm({
      nzTitle: '确认重新处理',
      nzContent: `确定要用当前配置重新处理文档「${doc.name}」吗？旧的分段数据将被清除。`,
      nzOnOk: async () => {
        this.processingIds.add(doc._id);
        try {
          // 用文档上已有的 config
          const config = doc.chunkConfig
            ? { strategy: doc.chunkConfig.strategy, chunkSize: doc.chunkConfig.chunkSize, overlap: doc.chunkConfig.overlap }
            : { strategy: 'auto' };
          await this.kbApi.processDocument(doc._id, config);
          this.message.success('重新处理完成');
          await this.loadDocuments();
        } catch (e) {
          this.message.error('重新处理失败: ' + (e as Error).message);
          await this.loadDocuments();
        } finally {
          this.processingIds.delete(doc._id);
        }
      },
    });
  }

  onDelete(doc: KbDocument) {
    this.modal.confirm({
      nzTitle: '确认删除',
      nzContent: `确定要删除文档「${doc.name}」及其所有向量数据吗？`,
      nzOnOk: async () => {
        try {
          await this.kbApi.deleteDocument(doc._id);
          this.message.success('已删除');
          this.loadDocuments();
        } catch (e) {
          this.message.error('删除失败');
        }
      },
    });
  }

  drawerVisible = false;
  currentDoc: KbDocument | null = null;

  getAllTags(doc: KbDocument): string[] {
    const auto = doc.autoTags || [];
    const manual = doc.manualTags || [];
    const merged = [...auto, ...manual];
    return [...new Set(merged)];
  }

  openDrawer(doc: KbDocument) {
    this.currentDoc = { ...doc };
    this.isEditingSummary = false;
    this.editingSummary = '';
    this.drawerVisible = true;
  }

  closeDrawer() {
    this.drawerVisible = false;
    this.currentDoc = null;
    this.isEditingSummary = false;
  }

  async onGenerateMetadata() {
    if (!this.currentDoc) return;
    this.generating = true;
    try {
      await this.kbApi.generateMetadata(this.currentDoc._id);
      this.message.success('标签生成完成');
      const res = await this.kbApi.listDocuments({
        page: this.page,
        pageSize: this.pageSize,
        category: this.filterCategory,
      });
      this.documents = res.list;
      this.total = res.total;
      const updated = this.documents.find(d => d._id === this.currentDoc!._id);
      if (updated) {
        this.currentDoc = { ...updated };
      }
    } catch (e) {
      this.message.error('生成标签失败: ' + (e as Error).message);
    } finally {
      this.generating = false;
    }
  }

  async onBatchGenerateMetadata() {
    this.batchGenerating = true;
    try {
      const result = await this.kbApi.generateAllMetadata();
      this.batchResult = result;
      this.batchResultVisible = true;
    } catch (e) {
      this.message.error('批量重试失败: ' + (e as Error).message);
    } finally {
      this.batchGenerating = false;
    }
  }

  async onBatchResultClose() {
    this.batchResultVisible = false;
    this.batchResult = null;
    await this.loadDocuments();
  }

  async onManualTagsChange(tags: string[]) {
    if (!this.currentDoc) return;
    const oldTags = this.currentDoc.manualTags || [];
    this.currentDoc.manualTags = tags;
    try {
      await this.kbApi.updateDocument(this.currentDoc._id, { manualTags: tags });
      const idx = this.documents.findIndex(d => d._id === this.currentDoc!._id);
      if (idx !== -1) {
        this.documents[idx].manualTags = tags;
      }
    } catch (e) {
      this.currentDoc.manualTags = oldTags;
      this.message.error('更新标签失败: ' + (e as Error).message);
    }
  }

  startEditSummary() {
    if (!this.currentDoc) return;
    this.editingSummary = this.currentDoc.summary || '';
    this.isEditingSummary = true;
  }

  cancelEditSummary() {
    this.isEditingSummary = false;
    this.editingSummary = '';
  }

  async onSaveSummary() {
    if (!this.currentDoc) return;
    const oldSummary = this.currentDoc.summary;
    this.currentDoc.summary = this.editingSummary;
    try {
      await this.kbApi.updateDocument(this.currentDoc._id, { summary: this.editingSummary });
      const idx = this.documents.findIndex(d => d._id === this.currentDoc!._id);
      if (idx !== -1) {
        this.documents[idx].summary = this.editingSummary;
      }
      this.isEditingSummary = false;
    } catch (e) {
      this.currentDoc.summary = oldSummary;
      this.message.error('保存摘要失败: ' + (e as Error).message);
    }
  }

  onFileSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    if (input.files?.length) {
      this.onUpload(input.files[0]);
      input.value = '';
    }
  }

  onPageChange(page: number) {
    this.page = page;
    this.loadDocuments();
  }
}
