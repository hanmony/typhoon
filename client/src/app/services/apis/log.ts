import { Injectable } from '@angular/core';
import { LogListReqDto } from '../../domain/log.list.req.dto';
import { LogListRespDto } from '../../domain/log.list.resp.dto';
import { Post, requestDone } from '../http.decorators';
import { _BaseApi } from './_base';

@Injectable({ providedIn: 'root' })
export class LogApi extends _BaseApi {
  @Post('/log/list')
  async getList(args: LogListReqDto): Promise<LogListRespDto> {
    requestDone(args);
  }
}
