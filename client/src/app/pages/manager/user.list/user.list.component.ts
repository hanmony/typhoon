import { Component, OnInit } from '@angular/core';
import { NzSafeAny } from 'ng-zorro-antd/core/types';
import { NzMessageService } from 'ng-zorro-antd/message';
import { NzModalService } from 'ng-zorro-antd/modal';
import { NzTableFilterList, NzTableQueryParams } from 'ng-zorro-antd/table';
import { NzUploadChangeParam } from 'ng-zorro-antd/upload';
import { getSelectLines, getSelectRoles } from '../../../app.util';
import { CommonNzModule } from '../../../common.nz.module';
import { BasePageFilterDto } from '../../../domain/base.page.filter.dto';
import { UserDataDto } from '../../../domain/user.data.dto';
import { ApiService } from '../../../services/api.service';
import { StorageService } from '../../../services/storage.service';
import { RoleListComponent } from '../../common/role.list/role.list.component';
import { TableStringFilterComponent } from '../../common/table.string.filter/table.string.filter.component';
import { ChangeRolesDialogComponent } from '../change.roles.dialog/change.roles.dialog.component';
import { CreateUserDialogComponent } from '../create.user.dialog/create.user.dialog.component';

@Component({
  selector: 'app-user.list',
  imports: [CommonNzModule, RoleListComponent, TableStringFilterComponent],
  templateUrl: './user.list.component.html',
  styleUrl: './user.list.component.less',
})
export class UserListComponent implements OnInit {
  constructor(
    private readonly api: ApiService,
    private readonly messages: NzMessageService,
    private readonly modal: NzModalService,
    private readonly storage: StorageService,
  ) {}

  users: UserDataDto[] = [];
  loading = false;
  filter: BasePageFilterDto = new BasePageFilterDto();
  rolesFilters: NzTableFilterList = [];
  linesFilters: NzTableFilterList = [];

  async ngOnInit(): Promise<void> {
    this.rolesFilters = [
      ...this.rolesFilters,
      ...getSelectRoles().map((r) => ({ text: r.label, value: r.value })),
    ];
    this.linesFilters = [
      ...this.linesFilters,
      ...getSelectLines().map((r) => ({ text: r.label, value: r.value })),
    ];
    // await this.refresh();
  }

  async onQueryParamsChange(params: NzTableQueryParams) {
    const { pageSize, pageIndex, sort, filter } = params;
    this.filter = new BasePageFilterDto();
    this.filter.page = pageIndex;
    this.filter.pageSize = pageSize;
    for (const f of filter) {
      (this.filter as NzSafeAny)[f.key] = f.value || undefined;
    }
    await this.refresh();
  }

  get httpHeaders() {
    const token = this.storage.token || '';
    return { authorization: `Bearer ${token}` };
  }

  async refresh() {
    this.loading = true;
    this.api.user
      .getList(this.filter)
      .then((users) => (this.users = users))
      .finally(() => (this.loading = false));
  }

  handleUploadChange(info: NzUploadChangeParam): void {
    if (info.file.status === 'done') {
      this.messages.success(`${info.file.name} 上传成功`);
      this.refresh();
    } else if (info.file.status === 'error') {
      this.messages.error(`${info.file.name} 上传失败`);
    }
  }

  async handleCreateNewUser() {
    this.modal
      .create({
        nzTitle: '创建新用户',
        nzContent: CreateUserDialogComponent,
        nzFooter: null,
      })
      .afterClose.subscribe((result) => {
        if (result) {
          this.refresh();
        }
      });
  }

  async handleDeleteUser(user: UserDataDto) {
    this.loading = true;
    await this.api.user
      .remove({ username: user.id })
      .then(() => {
        this.refresh();
      })
      .finally(() => (this.loading = false));
  }

  async handleChangeRoles(user: UserDataDto) {
    this.modal
      .create({
        nzContent: ChangeRolesDialogComponent,
        nzData: user,
      })
      .afterClose.subscribe((result) => {
        if (result) {
          user.roles = result;
        }
      });
  }

  async handleResetPassword(user: UserDataDto) {
    this.loading = true;
    await this.api.user
      .resetPassword({ username: user.id })
      .then(() => {
        this.messages.info('重置密码成功');
      })
      .finally(() => (this.loading = false));
  }
}
