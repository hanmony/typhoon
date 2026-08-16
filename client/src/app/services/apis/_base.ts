import { Injectable } from '@angular/core';
import { HttpService } from '../http.service';

@Injectable({ providedIn: 'root' })
export class _BaseApi {
  constructor(public readonly http: HttpService) {}
}
