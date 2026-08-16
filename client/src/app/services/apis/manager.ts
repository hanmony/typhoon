import { Injectable } from '@angular/core';
import { ActionAccessoryDto } from '../../domain/action.accessory.dto';
import { ActionDto } from '../../domain/action.dto';
import { CaseDocMetaDto } from '../../domain/case.doc.meta.dto';
import { CaseDetailDto, CaseDto, CaseStatus } from '../../domain/case.dto';
import { CommonRespDto } from '../../domain/common.resp.dto';
import { PathInfoDto } from '../../domain/path.info.dto';
import { StartEditDto } from '../../domain/start.edit.dto';
import { UpdatePropertyDto } from '../../domain/update.property.dto';
import { Delete, Get, Post, requestDone } from '../http.decorators';
import { _BaseApi } from './_base';

@Injectable({ providedIn: 'root' })
export class ManagerApi extends _BaseApi {
  @Get('/manager/cases', false, ['status'])
  async getCases(status: CaseStatus): Promise<CaseDto[]> {
    requestDone(status);
  }

  @Get('/manager/case', false, ['id'])
  async getCase(id: string): Promise<CaseDto> {
    requestDone(id);
  }

  @Get('/manager/case-detail', false, ['id'])
  async getCaseDetail(id: string): Promise<CaseDetailDto> {
    requestDone(id);
  }

  @Get('/manager/path-info', false, ['id'])
  async getPathInfos(id: string): Promise<PathInfoDto[]> {
    requestDone(id);
  }

  @Get('/manager/events', false, ['caseId', 'category'])
  async getEvents(caseId: string, category: string): Promise<ActionDto[]> {
    requestDone(caseId, category);
  }

  @Post('/manager/editor/update-case-property')
  async updateCaseProperty(args: UpdatePropertyDto): Promise<CommonRespDto> {
    requestDone(args);
  }

  @Post('/manager/editor/update-action-property')
  async updateActionProperty(args: UpdatePropertyDto): Promise<CommonRespDto> {
    requestDone(args);
  }

  @Post('/manager/editor/start-edit')
  async startEdit(args: StartEditDto): Promise<CaseDto> {
    requestDone(args);
  }

  @Post('/manager/editor/finish-edit')
  async finishEdit(args: StartEditDto): Promise<CaseDto> {
    requestDone(args);
  }

  @Post('/manager/editor/delete')
  async deleteCase(args: StartEditDto): Promise<CommonRespDto> {
    requestDone(args);
  }

  @Post('/manager/editor/deactive')
  async deactiveCase(args: StartEditDto): Promise<CaseDto> {
    requestDone(args);
  }

  @Post('/manager/editor/active')
  async activeCase(args: StartEditDto): Promise<CaseDto> {
    requestDone(args);
  }

  @Delete('/manager/editor/delete-doc', false, ['case', 'filename'])
  async deleteDoc(caseId: string, filename: string): Promise<CaseDocMetaDto[]> {
    requestDone(caseId, filename);
  }

  @Delete('/manager/editor/delete-accessory', false, ['action', 'filename'])
  async deleteAccessory(
    action: string,
    filename: string,
  ): Promise<ActionAccessoryDto[]> {
    requestDone(action, filename);
  }

  @Get('/manager/editor/get-docs', false, ['case'])
  async getDocs(caseId: string): Promise<CaseDocMetaDto[]> {
    requestDone(caseId);
  }
}
