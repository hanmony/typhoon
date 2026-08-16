import { Injectable } from '@angular/core';
import { LoginReqDto } from '../domain/login.req.dto';
import { LoginRespDto } from '../domain/login.resp.dto';
import { ApiService } from './api.service';
import { StorageService } from './storage.service';

@Injectable({
  providedIn: 'root',
})
export class AuthService {
  constructor(
    private readonly storage: StorageService,
    private readonly api: ApiService,
  ) {
    this.token = this.storage.token;
  }

  private token?: string;

  get isLogin(): boolean {
    return this.token != undefined;
  }

  getToken(): string | undefined {
    return this.token;
  }

  async login(loginInfo: LoginReqDto): Promise<LoginRespDto> {
    const result = await this.api.auth.login(loginInfo).catch((err) => {
      throw err;
    });
    await this.afterLogin(result);
    return result;
  }

  async loginX5(params: string): Promise<LoginRespDto | undefined> {
    const result = await this.api.auth.loginX5({ params }).catch((err) => {
      console.error('loginX5 error', err);
      throw err;
    });
    await this.afterLogin(result);
    return result;
  }

  async autoLogin(): Promise<boolean> {
    this.token = this.storage.token;
    if (!this.token) {
      return false;
    }
    return true;
  }

  private async afterLogin(result: LoginRespDto) {
    this.storage.token = result.token;
    const autoLogin = await this.autoLogin();
    if (!autoLogin) {
      return undefined;
    }
    return result;
  }
}
