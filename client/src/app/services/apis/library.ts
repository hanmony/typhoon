import { Injectable } from '@angular/core';
import { CaseDto } from '../../domain/case.dto';
import { Get, requestDone } from '../http.decorators';
import { _BaseApi } from './_base';

@Injectable({ providedIn: 'root' })
export class LibraryApi extends _BaseApi {
  @Get('/portal/discover', false, [])
  async getCasesMapByCategory(): Promise<Record<string, CaseDto[]>> {
    requestDone();
  }
  @Get('/portal/list', false, ['search', 'year', 'category'])
  async getCaseList(
    search: string,
    year: string[],
    category: string[],
  ): Promise<CaseDto[]> {
    requestDone();
  }

  @Get('/portal/cases', false, ['year', 'order'])
  async getCases(year: string, order: string): Promise<CaseDto[]> {
    requestDone();
  }
}
