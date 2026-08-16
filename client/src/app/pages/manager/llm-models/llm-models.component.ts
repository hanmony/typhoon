import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { NzMessageService } from 'ng-zorro-antd/message';
import { NzModalService } from 'ng-zorro-antd/modal';
import { CommonNzModule } from '../../../common.nz.module';
import { LlmModelApi, LlmModel } from '../../../services/apis/llm-model';

@Component({
  selector: 'app-llm-models',
  standalone: true,
  imports: [CommonNzModule, FormsModule],
  templateUrl: './llm-models.component.html',
  styleUrl: './llm-models.component.less',
})
export class LlmModelsComponent implements OnInit {
  models = signal<LlmModel[]>([]);
  loading = signal(false);
  drawerVisible = signal(false);
  drawerTitle = signal('添加模型');
  editingId = signal<string | null>(null);
  saving = signal(false);
  testing = signal(false);

  form = signal({
    name: '',
    baseUrl: '',
    apiKey: '',
    model: '',
  });

  constructor(
    private readonly api: LlmModelApi,
    private readonly messages: NzMessageService,
    private readonly modal: NzModalService,
  ) {}

  ngOnInit() {
    this.loadModels();
  }

  async loadModels() {
    this.loading.set(true);
    try {
      const data = await this.api.list();
      this.models.set(data);
    } catch (e: any) {
      this.messages.error(e.message || '加载失败');
    } finally {
      this.loading.set(false);
    }
  }

  openCreate() {
    this.editingId.set(null);
    this.drawerTitle.set('添加模型');
    this.form.set({ name: '', baseUrl: '', apiKey: '', model: '' });
    this.drawerVisible.set(true);
  }

  openEdit(model: LlmModel) {
    this.editingId.set(model._id);
    this.drawerTitle.set('编辑模型');
    this.form.set({
      name: model.name,
      baseUrl: model.baseUrl,
      apiKey: '', // 不回显 apiKey
      model: model.model,
    });
    this.drawerVisible.set(true);
  }

  closeDrawer() {
    this.drawerVisible.set(false);
  }

  async save() {
    const f = this.form();
    if (!f.name || !f.baseUrl || !f.model) {
      this.messages.warning('请填写必填字段');
      return;
    }
    // 新建时 apiKey 必填
    if (!this.editingId() && !f.apiKey) {
      this.messages.warning('请填写 API Key');
      return;
    }

    this.saving.set(true);
    try {
      if (this.editingId()) {
        const payload: any = { name: f.name, baseUrl: f.baseUrl, model: f.model };
        if (f.apiKey) payload.apiKey = f.apiKey;
        await this.api.update(this.editingId()!, payload);
        this.messages.success('更新成功');
      } else {
        await this.api.create(f);
        this.messages.success('创建成功');
      }
      this.drawerVisible.set(false);
      this.loadModels();
    } catch (e: any) {
      this.messages.error(e.message || '保存失败');
    } finally {
      this.saving.set(false);
    }
  }

  confirmDelete(model: LlmModel) {
    if (model.role) {
      this.messages.warning('默认模型不可删除，请先更换默认设置');
      return;
    }
    this.modal.confirm({
      nzTitle: '确认删除',
      nzContent: `确定要删除模型「${model.name}」吗？`,
      nzOnOk: async () => {
        try {
          await this.api.delete(model._id);
          this.messages.success('删除成功');
          this.loadModels();
        } catch (e: any) {
          this.messages.error(e.message || '删除失败');
        }
      },
    });
  }

  async setDefaultLarge(model: LlmModel) {
    try {
      await this.api.setRole(model._id, 'default-large');
      this.messages.success('已设为默认大模型');
      this.loadModels();
    } catch (e: any) {
      this.messages.error(e.message || '设置失败');
    }
  }

  async setDefaultSmall(model: LlmModel) {
    try {
      await this.api.setRole(model._id, 'default-small');
      this.messages.success('已设为默认小模型');
      this.loadModels();
    } catch (e: any) {
      this.messages.error(e.message || '设置失败');
    }
  }

  async testConnection() {
    const f = this.form();
    if (!f.baseUrl || !f.apiKey || !f.model) {
      this.messages.warning('请先填写 API 地址、API Key 和模型 ID');
      return;
    }
    this.testing.set(true);
    try {
      const result = await this.api.testConnection({
        baseUrl: f.baseUrl,
        apiKey: f.apiKey,
        model: f.model,
      });
      if (result.success) {
        this.messages.success('连接成功');
      } else {
        this.messages.error(`连接失败：${result.message}`);
      }
    } catch (e: any) {
      this.messages.error(e.message || '测试失败');
    } finally {
      this.testing.set(false);
    }
  }

  getRoleLabel(role: string | null): string {
    switch (role) {
      case 'default-large': return '默认大模型';
      case 'default-small': return '默认小模型';
      default: return '';
    }
  }

  getRoleColor(role: string | null): string {
    switch (role) {
      case 'default-large': return 'blue';
      case 'default-small': return 'green';
      default: return '';
    }
  }
}
