import { Injectable } from '@angular/core';

import { _BaseApi } from './_base';

@Injectable({ providedIn: 'root' })
export class PatrollingApi extends _BaseApi {
  async getTourList(): Promise<PatrollingType.TourDto[]> {
    return this.http.get('/patrolling/tour/list');
  }

  async addTour(
    data: PatrollingType.TourMeta,
  ): Promise<PatrollingType.TourDto> {
    return this.http.post('/patrolling/tour/add', data);
  }

  async removeTour(id: string): Promise<void> {
    return this.http.get('/patrolling/tour/remove', { id });
  }

  async removeAllOnLine(line: string): Promise<void> {
    return this.http.get('/patrolling/tour/removeAllByLine', { line });
  }
}
