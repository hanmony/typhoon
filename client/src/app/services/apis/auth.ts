import { Injectable } from '@angular/core';
import { CommonRespDto } from '../../domain/common.resp.dto';
import { LoginReqDto } from '../../domain/login.req.dto';
import { LoginRespDto } from '../../domain/login.resp.dto';
import { Post, requestDone } from '../http.decorators';
import { _BaseApi } from './_base';

@Injectable({ providedIn: 'root' })
export class AuthApi extends _BaseApi {
  @Post('/auth/login')
  async login(data: LoginReqDto): Promise<LoginRespDto> {
    requestDone(data);
  }

  @Post('/auth/login-x5')
  async loginX5(data: { params: string }): Promise<LoginRespDto> {
    requestDone(data);
  }

  @Post('/auth/logout')
  async logout(): Promise<CommonRespDto> {
    requestDone();
  }
}
