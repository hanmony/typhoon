import { Injectable } from '@angular/core';
import { environment as env } from '../../../environments/environment';
import { HttpService } from '../http.service';
import { StorageService } from '../storage.service';
import { _BaseApi } from './_base';
import { fetchSSEStream, SSEStreamHandlers, ToolEventData, UsageEventData } from './sse-stream';

export { ToolEventData };
export { UsageEventData };

export interface ThinkingRound {
  label: string;
  content: string;
  collapsed?: boolean;
}

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  thinking?: string;
  thinkingRounds?: ThinkingRound[];
  thinkingCollapsed?: boolean;
  streaming?: boolean;
  usage?: UsageEventData;
  toolEvents?: ToolEventData[];
}

export interface QueryStreamCallbacks {
  onToken: (token: string) => void;
  onError: (err: Error) => void;
  onComplete: () => void;
  onStatus?: (status: string) => void;
  onThinking?: (thinking: string) => void;
  onStage?: (stage: string) => void;
  onTool?: (data: ToolEventData) => void;
  onUsage?: (data: UsageEventData) => void;
}

export interface QueryStreamOptions {
  history?: { role: 'user' | 'assistant'; content: string }[];
  from?: string;
  modelId?: string;
}

@Injectable({ providedIn: 'root' })
export class ChatApi extends _BaseApi {
  constructor(
    http: HttpService,
    private readonly storage: StorageService,
  ) {
    super(http);
  }

  queryStream(
    question: string,
    callbacks: QueryStreamCallbacks,
    options?: QueryStreamOptions,
  ): () => void {
    const { history, from, modelId } = options || {};
    return fetchSSEStream(callbacks as SSEStreamHandlers, {
      url: `${env.baseUrl}/chat/stream`,
      body: { question, history, from, ...(modelId ? { modelId } : {}) },
      token: this.storage.token,
      format: 'typed',
    });
  }

  /** Agent 模式流式查询 — 请求 /agent/stream 端点 */
  queryAgentStream(
    question: string,
    callbacks: QueryStreamCallbacks,
    options?: QueryStreamOptions,
  ): () => void {
    const { history, from, modelId } = options || {};
    return fetchSSEStream(callbacks as SSEStreamHandlers, {
      url: `${env.baseUrl}/agent/stream`,
      body: { question, history, from, ...(modelId ? { modelId } : {}) },
      token: this.storage.token,
      format: 'typed',
    });
  }
}
