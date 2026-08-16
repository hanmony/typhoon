import { Component, Inject } from '@angular/core';
import { NzMessageService } from 'ng-zorro-antd/message';
import { NZ_MODAL_DATA, NzModalRef } from 'ng-zorro-antd/modal';
import { CommonNzModule } from '../../../common.nz.module';
import { UserDataDto } from '../../../domain/user.data.dto';
import { ApiService } from '../../../services/api.service';
import { RoleSelectorComponent } from '../../common/role.selector/role.selector.component';

@Component({
  selector: 'app-change.roles.dialog',
  imports: [CommonNzModule, RoleSelectorComponent],
  templateUrl: './change.roles.dialog.component.html',
  styleUrl: './change.roles.dialog.component.less',
})
export class ChangeRolesDialogComponent {
  constructor(
    @Inject(NZ_MODAL_DATA) public data: UserDataDto,
    private modalRef: NzModalRef,
    private messages: NzMessageService,
    private api: ApiService,
  ) {
    this.roles = data.roles;
  }

  roles: string[] = [];
  loading = false;

  async handleConfirm() {
    if (this.roles.length === 0) {
      this.messages.error('至少选择一个角色');
      return;
    }
    this.loading = true;
    await this.api.user
      .setRoles({
        username: this.data.id,
        roles: this.roles,
      })
      .then(() => {
        this.modalRef.close(this.roles);
      })
      .finally(() => {
        this.loading = false;
      });
  }

  handleCancel() {
    this.modalRef.close();
  }
}
