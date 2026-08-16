import { Component } from '@angular/core';
import { NavigationEnd, Router, RouterModule } from '@angular/router';
import { NzMessageService } from 'ng-zorro-antd/message';
import { NzModalService } from 'ng-zorro-antd/modal';
import { filter } from 'rxjs';
import { CommonNzModule } from '../../common.nz.module';
import { RolesInDirective } from '../../middlewares/roles.in.directive';
import { ApiService } from '../../services/api.service';
import { SettingService } from '../../services/setting.service';
import { StorageService } from '../../services/storage.service';
import { ChangePasswordDialogComponent } from './change.password.dialog/change.password.dialog.component';

@Component({
  selector: 'app-manager',
  imports: [CommonNzModule, RouterModule, RolesInDirective],
  templateUrl: './manager.component.html',
  styleUrl: './manager.component.less',
})
export class ManagerComponent {
  constructor(
    private readonly messages: NzMessageService,
    public readonly settings: SettingService,
    private readonly storage: StorageService,
    private readonly api: ApiService,
    private readonly modal: NzModalService,
    private readonly router: Router,
  ) {}

  loading = false;

  ngOnInit() {
    this.router.events
      .pipe(filter((event) => event instanceof NavigationEnd))
      .subscribe(() => {
        // 这里可以添加处理路由变化的逻辑
        console.log('当前路由:', this.router.url);
      });
  }

  handleLogout() {
    this.loading = true;
    this.api.auth
      .logout()
      .then(() => {
        this.settings.clear();
        this.storage.token = '';
        this.router.navigate(['/login']);
      })
      .finally(() => (this.loading = false));
  }
  backToHome() {
    this.router.navigate(['/portal']);
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
