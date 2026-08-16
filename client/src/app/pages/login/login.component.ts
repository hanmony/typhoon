import {
  animate,
  state,
  style,
  transition,
  trigger,
} from '@angular/animations';
import { Component, ElementRef, ViewChild } from '@angular/core';
import {
  UntypedFormBuilder,
  UntypedFormGroup,
  Validators,
} from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { NzMessageService } from 'ng-zorro-antd/message';
import { NzModalService } from 'ng-zorro-antd/modal';
import { lastValueFrom } from 'rxjs';
import { checkUserAgent, waitForSeconds } from '../../app.util';
import { CommonNzModule } from '../../common.nz.module';
import { AuthService } from '../../services/auth.service';
import { CryptoService } from '../../services/crypto.service';
import { StorageService } from '../../services/storage.service';
import { StorageUser } from '../../services/storage.user';
import { UserService } from '../../services/user.service';
import { SettingService } from './../../services/setting.service';
import { InitPasswordDialogComponent } from './init.password.dialog/init.password.dialog.component';
import { LoginUserListComponent } from './login.user.list/login.user.list.component';

@Component({
  selector: 'app-login',
  imports: [CommonNzModule, RouterModule, LoginUserListComponent],
  templateUrl: './login.component.html',
  styleUrl: './login.component.less',
  animations: [
    trigger('dropdown', [
      state('in', style({ transform: 'translate(0, 0%)', opacity: 1 })),
      transition('void => *', [
        style({ transform: 'translate(0, -100%)', opacity: 0 }),
        animate(200),
      ]),
      transition('* => void', [
        animate(200, style({ transform: 'translate(0, -100%)', opacity: 0 })),
      ]),
    ]),
  ],
})
export class LoginComponent {
  @ViewChild('passwordRef') passwordRef?: ElementRef<HTMLInputElement>;

  transform = 'scale(1)';
  isAndroidTablet = false;

  constructor(
    private fb: UntypedFormBuilder,
    private readonly auth: AuthService,
    private readonly user: UserService,
    private readonly crypto: CryptoService,
    private readonly storage: StorageService,
    private readonly setting: SettingService,
    private readonly messages: NzMessageService,
    private readonly router: Router,
    private readonly modal: NzModalService,
  ) {}

  ngOnInit(): void {
    this.setDeviceProperties();
    this.validateForm = this.fb.group({
      userName: [null, [Validators.required]],
      password: [null, [Validators.required]],
      remember: [true],
    });

    this.initUserInfo();
  }

  setDeviceProperties() {
    if (checkUserAgent().isAndroidTablet) {
      this.transform = 'scale(1)';
      this.isAndroidTablet = true;
    } else {
      this.transform = 'scale(1)';
      this.isAndroidTablet = false;
    }
  }

  initUserInfo() {
    const rememberMe = this.storage.getBoolean('rememberMe');
    if (rememberMe) {
      this.validateForm.setValue({
        userName: this.storage.getString('username'),
        password: this.storage.getString('password'),
        remember: true,
      });
    } else {
      this.validateForm.setValue({
        userName: null,
        password: null,
        remember: false,
      });
    }
  }
  rememberMe = false;
  validateForm!: UntypedFormGroup;
  landing = false;
  userListVisible = false;

  async submitForm() {
    if (this.landing) return;
    if (!this.validateForm.valid) {
      Object.values(this.validateForm.controls).forEach((control) => {
        if (control.invalid) {
          control.markAsDirty();
          control.updateValueAndValidity({ onlySelf: true });
        }
      });
      return;
    }

    this.landing = true;
    await waitForSeconds(1);
    const rememberMe = this.validateForm.get('remember')?.value;
    const username = this.validateForm.get('userName')?.value;
    let plainPassword = this.validateForm.get('password')?.value;
    const password = this.crypto.sm3(plainPassword);
    const resp = await this.auth.login({ username, password }).finally(() => {
      this.landing = false;
    });

    if (resp.password) {
      // init password
      plainPassword = await lastValueFrom(
        this.modal.create({
          nzContent: InitPasswordDialogComponent,
          nzTitle: '设置密码',
          nzCancelDisabled: true,
          nzClosable: false,
          nzMaskClosable: false,
        }).afterClose,
      );
    }

    if (rememberMe) {
      this.storage.setString('username', username);
      this.storage.setString('password', plainPassword);
      this.storage.setBoolean('rememberMe', true);

      // save user
      this.storage.addUser({
        id: username,
        name: resp?.name!,
        password: plainPassword,
      });
    } else {
      this.storage.setString('username', '');
      this.storage.setString('password', '');
      this.storage.setBoolean('rememberMe', false);
    }
    await this.setting.init();

    if (this.setting.isSupervisor) {
      location.replace('/supervisor');
      return;
    }
    await this.afterLogin();
  }

  onClickResetUserPassword() {}
  onUerNameKeyup(ev: KeyboardEvent) {
    if (ev.key === 'Enter') {
      this.passwordRef?.nativeElement.focus();
    }
  }
  onPasswordKeyup(ev: KeyboardEvent) {
    if (ev.key === 'Enter') {
      this.submitForm();
    }
  }
  selectUser(result: StorageUser) {
    this.userListVisible = false;
    this.validateForm.setValue({
      userName: result.id,
      password: result.password,
      remember: true,
    });
    this.submitForm();
  }

  private async afterLogin() {
    const { url } = this.router;
    const l = new URL(location.origin + url);
    const form = l.searchParams.get('from');
    const nvUrl = form ? form : '/portal';
    location.replace(nvUrl);
  }
  get userNameError() {
    const userName = this.validateForm.get('userName');
    if (!userName?.dirty) return '';
    if (userName?.hasError('required')) {
      return '请输入账户';
    }
    return '';
  }
  get passwordError() {
    const password = this.validateForm.get('password');
    if (!password?.dirty) return '';
    if (password?.hasError('required')) {
      return '请输入密码';
    }
    return '';
  }
}
