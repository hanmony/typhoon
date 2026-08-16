import { Injectable } from '@angular/core';
import { UserDataDto } from '../domain/user.data.dto';
import { ApiService } from './api.service';
import { AuthService } from './auth.service';
import { StorageService } from './storage.service';

@Injectable({
  providedIn: 'root',
})
export class SettingService {
  constructor(
    private readonly api: ApiService,
    private readonly auth: AuthService,
    private readonly storage: StorageService,
  ) {
    const userInfoString = this.storage.getString('userInfo');
    if (userInfoString) {
      this.user = JSON.parse(userInfoString) as UserDataDto;
    }
  }

  user?: UserDataDto;

  private _initialized = false;

  clear() {
    this._initialized = false;
    this.user = undefined;
  }

  async init(): Promise<boolean> {
    if (this._initialized) {
      return true;
    }

    if (!this.auth.autoLogin()) {
      return false;
    }

    return await this.onInit().catch((err) => {
      console.error('init error', err);
      return false;
    });
  }

  private async onInit() {
    const info = await this.api.user.getMyInfo();
    this.user = info;
    this.storage.setString('userInfo', JSON.stringify(info));
    if (this.isOccAdmin) {
      this.storage.setString('occAdminLine', this.occAdminLine);
    }
    this._initialized = true;
    return true;
  }

  hasRoleKey(key: string) {
    if (!this.user) return false;
    return this.user.roles.includes(key);
  }

  get isOccAdmin() {
    return this.hasRoleKey('occManager');
  }
  get occAdminLine() {
    if (!this.isOccAdmin) return '';
    return this.user!.line;
  }

  get isCoccAdmin() {
    return this.hasRoleKey('coccManager');
  }
  get isCommandAdmin() {
    return this.hasRoleKey('emergencyManager');
  }

  get isSupervisor() {
    return this.hasRoleKey('groupManager');
  }
  get isAdmin() {
    return this.hasRoleKey('admin');
  }
}
