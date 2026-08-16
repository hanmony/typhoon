import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { NzMessageService } from 'ng-zorro-antd/message';
import { AuthService } from './services/auth.service';
import { SettingService } from './services/setting.service';

export const appGuard: CanActivateFn = async (route, state) => {
  const router = inject(Router);
  const auth = inject(AuthService);
  const settings = inject(SettingService);
  const messages = inject(NzMessageService);

  if (!auth.isLogin) {
    if (!(await auth.autoLogin())) {
      messages.error('无权限访问');
      return router.parseUrl('/login');
    }
  }

  const result = await settings.init();
  if (!result) {
    messages.error('无权限访问');
    return router.parseUrl('/login');
  }
  return true;
};
