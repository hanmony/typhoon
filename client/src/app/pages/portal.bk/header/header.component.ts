import { Component, EventEmitter, Output } from '@angular/core';
import { Router } from '@angular/router';
import { NzMessageService } from 'ng-zorro-antd/message';
import { NzModalService } from 'ng-zorro-antd/modal';
import { LibraryNzModule } from '../../../library.nz.module';
import { ApiService } from '../../../services/api.service';
import { SettingService } from '../../../services/setting.service';
import { StorageService } from '../../../services/storage.service';
import { ChangePasswordDialogComponent } from '../../manager/change.password.dialog/change.password.dialog.component';

@Component({
  selector: 'portal-header',
  imports: [LibraryNzModule],
  templateUrl: './header.component.html',
  styleUrl: './header.component.less',
})
export class PortalHeaderComponent {
  @Output() onQuery = new EventEmitter();
  constructor(
    public readonly settings: SettingService,
    private readonly storage: StorageService,
    private readonly api: ApiService,
    private readonly router: Router,
    private readonly messages: NzMessageService,
    private modal: NzModalService,
  ) {}
  ngAfterViewInit() {
    if (!this.settings.user) this.settings.init();
  }
  openManagement() {
    window.open('/manager/list');
  }
  onQueryClick() {
    this.onQuery.emit();
  }
  handleLogout() {
    this.api.auth.logout().then(() => {
      this.settings.clear();
      this.storage.token = '';
      this.router.navigate(['/login']);
    });
  }
  handleChangePassword() {
    this.modal
      .create({
        nzContent: ChangePasswordDialogComponent,
        nzTitle: '修改密码',
      })
      .afterClose.subscribe((result) => {
        if (result) {
          this.messages.info('修改密码成功');
        }
      });
  }
}
