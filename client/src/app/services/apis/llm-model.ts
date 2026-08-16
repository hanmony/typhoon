import { Injectable } from '@angular/core';
import { _BaseApi } from './_base';
import { HttpService } from '../http.service';

export interface LlmModel {
  _id: string;
  name: string;
  baseUrl: string;
  apiKey: string;
  model: string;
  role: 'default-large' | 'default-small' | null;
  createdAt: string;
  updatedAt: string;
}

export interface TestConnectionResult {
  success: boolean;
  message: string;
}

@Injectable({ providedIn: 'root' })
export class LlmModelApi extends _BaseApi {
  constructor(http: HttpService) {
    super(http);
  }

  async list(): Promise<LlmModel[]> {
    return this.http.get('/llm-models');
  }

  async create(data: { name: string; baseUrl: string; apiKey: string; model: string }): Promise<LlmModel> {
    return this.http.post('/llm-models', data);
  }

  async update(id: string, data: { name?: string; baseUrl?: string; apiKey?: string; model?: string }): Promise<LlmModel> {
    return this.http.put(`/llm-models/${id}`, data);
  }

  async delete(id: string): Promise<any> {
    return this.http.delete(`/llm-models/${id}`);
  }

  async setRole(id: string, role: 'default-large' | 'default-small'): Promise<any> {
    return this.http.put(`/llm-models/${id}/role`, { role });
  }

  async testConnection(data: { baseUrl: string; apiKey: string; model: string }): Promise<TestConnectionResult> {
    return this.http.post('/llm-models/test', data);
  }
}
