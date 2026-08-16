import { Inject, Injectable } from '@angular/core';
import { _BaseApi } from './_base';
import { HttpService } from '../http.service';
import { StorageService } from '../storage.service';
import { environment as env } from '../../../environments/environment';
import { fetchSSEStream } from './sse-stream';

export interface ChunkConfig {
  strategy: 'paragraph' | 'sliding_window';
  chunkSize: number;
  overlap: number;
}

export interface KbDocument {
  _id: string;
  name: string;
  fileType: string;
  fileSize: number;
  status: number;
  statusMessage: string;
  chunkCount?: number;
  category?: string;
  chunkConfig?: ChunkConfig;
  autoTags?: string[];
  manualTags?: string[];
  summary?: string;
  createdAt: string;
  updatedAt: string;
}

export interface KbDocumentListResult {
  list: KbDocument[];
  total: number;
}

export interface FailedItem {
  id: string;
  name: string;
  error: string;
}

export interface GenerateAllMetadataResponse {
  processed: number;
  failed?: FailedItem[];
}

export interface RagResponse {
  answer: string;
  sources: { content: string; documentName: string; chunkIndex: number; score: number }[];
}

@Injectable({ providedIn: 'root' })
export class KnowledgeBaseApi extends _BaseApi {
  constructor(
    http: HttpService,
    private readonly storage: StorageService,
  ) {
    super(http);
  }

  async upload(file: File, category?: string): Promise<any> {
    const formData = new FormData();
    formData.append('file', file);
    if (category) formData.append('category', category);
    const token = this.storage.token;
    const resp = await fetch(`${env.baseUrl}/kb/document/upload`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body: formData,
    });
    if (!resp.ok) {
      const err = await resp.json().catch(() => ({ message: resp.statusText }));
      throw new Error(err.message || 'Upload failed');
    }
    return resp.json();
  }

  async processDocument(documentId: string, config?: { strategy?: string; chunkSize?: number; overlap?: number }): Promise<any> {
    return this.http.post('/kb/document/process', { documentId, ...config });
  }

  async saveChunkConfig(id: string, config: { strategy: string; chunkSize: number; overlap: number }): Promise<any> {
    return this.http.patch(`/kb/document/${id}/chunk-config`, config);
  }

  async listDocuments(params: {
    name?: string;
    fileType?: string;
    status?: number;
    category?: string;
    page: number;
    pageSize: number;
  }): Promise<KbDocumentListResult> {
    return this.http.post('/kb/document/list', params);
  }

  async deleteDocument(id: string): Promise<any> {
    return this.http.delete(`/kb/document/${id}`);
  }

  async updateCategory(id: string, category: string): Promise<any> {
    return this.http.patch(`/kb/document/${id}/category`, { category });
  }

  async updateDocument(id: string, data: { manualTags?: string[]; summary?: string }): Promise<any> {
    return this.http.patch(`/kb/document/${id}`, data);
  }

  async generateMetadata(id: string): Promise<any> {
    return this.http.post(`/kb/document/${id}/metadata`, {});
  }

  async generateAllMetadata(): Promise<GenerateAllMetadataResponse> {
    return this.http.post('/kb/document/generate-metadata', {});
  }

  async query(question: string, topK?: number, category?: string): Promise<RagResponse> {
    return this.http.post('/kb/query', { question, topK, category });
  }

  queryStream(
    question: string,
    topK: number,
    onToken: (token: string) => void,
    onError: (err: Error) => void,
    onComplete: () => void,
    category?: string,
    onSources?: (sources: any[]) => void,
    history?: { role: 'user' | 'assistant'; content: string }[],
    onThinking?: (thinking: string) => void,
  ): () => void {
    return fetchSSEStream(
      { onToken, onError, onComplete, onThinking, onSources },
      {
        url: `${env.baseUrl}/kb/query/stream`,
        body: { question, topK, category, history },
        token: this.storage.token,
        format: 'flat',
      },
    );
  }
}
