// src/app/services/apis/contingencyPlan.ts
import { Injectable } from '@angular/core';
import { _BaseApi } from './_base';
// 移除 HttpClient 和 HttpParams 的导入，因为它们已经在 _BaseApi 中处理了

export interface DigitalPlanListRequest {
  id?: string;
  name?: string;
  url?: string;
  period?: string[];
  page: number;
  pageSize: number;
}

export interface DigitalPlanListItem {
  id: string;
  name: string;
  url: string;
  period: string[];
}

export interface DigitalPlanListResponse {
  data: DigitalPlanListItem[];
  total: number;
  page: number;
  pageSize: number;
}

export interface AddDigitalPlanRequest {
  name: string;
  updatedTime: string;
  url: string;
}

export interface AddDigitalPlanResponse {
  id: string;
  name: string;
  url: string;
  updatedTime: string;
  status: Record<string, any>;
  createdAt: string;
  updatedAt: string;
}

export interface RemoveDigitalPlanRequest {
  id: string;
}

export interface RemoveDigitalPlanResponse {
  code: number;
  message: string;
}

@Injectable({ providedIn: 'root' })
export class contingencyPlan extends _BaseApi {
  async getDigitalPlanList(
    params: DigitalPlanListRequest,
  ): Promise<DigitalPlanListResponse> {
    return this.http.post('/digital/plan/list', params);
  }

  async addDigitalPlan(
    params: AddDigitalPlanRequest,
  ): Promise<AddDigitalPlanResponse> {
    return this.http.post('/digital/plan/add', params);
  }

  async removeDigitalPlan(
    params: RemoveDigitalPlanRequest,
  ): Promise<RemoveDigitalPlanResponse> {
    return this.http.get<RemoveDigitalPlanResponse>(
      `/digital/plan/remove?id=${params.id}`,
    );
  }
}
