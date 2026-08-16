import { Injectable } from '@angular/core';
import { BasePageFilterDto } from '../../domain/base.page.filter.dto';
import { ChangePasswordDto } from '../../domain/change.password.dto';
import { CommonRespDto } from '../../domain/common.resp.dto';
import { CreateUserDto } from '../../domain/create.user.dto';
import { EncryptionParamDto } from '../../domain/encryption.param.dto';
import { SetRolesDto } from '../../domain/set.roles.dto';
import { UserDataDto } from '../../domain/user.data.dto';
import { UsernameDto } from '../../domain/username.dto';
import { Get, Post, requestDone } from '../http.decorators';
import { _BaseApi } from './_base';

@Injectable({ providedIn: 'root' })
export class UserApi extends _BaseApi {
  @Get('/user/my-info')
  async getMyInfo(): Promise<UserDataDto> {
    requestDone();
  }
  @Get('/user/all')
  async getAll(): Promise<UserDataDto[]> {
    requestDone();
  }

  @Post('/user/list')
  async getList(data: BasePageFilterDto): Promise<UserDataDto[]> {
    requestDone(data);
  }

  @Post('/user/create')
  async create(data: CreateUserDto): Promise<UserDataDto> {
    requestDone(data);
  }
  @Post('/user/remove')
  async remove(data: UsernameDto): Promise<CommonRespDto> {
    requestDone(data);
  }
  @Post('/user/change-password')
  async changePassword(data: ChangePasswordDto): Promise<CommonRespDto> {
    requestDone(data);
  }

  @Post('/user/init-password')
  async initPassword(data: ChangePasswordDto): Promise<CommonRespDto> {
    requestDone(data);
  }

  @Get('/user/fetchEncryptionParam')
  async fetchEncryptionParam(): Promise<EncryptionParamDto> {
    requestDone();
  }

  @Post('/user/reset-password')
  async resetPassword(data: UsernameDto): Promise<CommonRespDto> {
    requestDone(data);
  }

  @Post('/user/set-roles')
  async setRoles(data: SetRolesDto): Promise<CommonRespDto> {
    requestDone(data);
  }
}
