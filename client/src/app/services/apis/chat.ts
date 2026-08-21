import { Injectable } from '@angular/core';
import { environment as env } from '../../../environments/environment';
import { HttpService } from '../http.service';
import { StorageService } from '../storage.service';
import { _BaseApi } from './_base';
import { fetchSSEStream, SSEStreamHandlers, ToolEventData, UsageEventData, AnalysisPayload, AnalysisLineImpact, AnalysisSimilarCase } from './sse-stream';

export { ToolEventData };
export { UsageEventData };
export { AnalysisPayload };
export { AnalysisLineImpact };
export { AnalysisSimilarCase };

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
  /** AI 研判卡片（alert-analyzer analysis 事件） */
  analysis?: AnalysisPayload;
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
  /** AI 研判：analysis 事件（结构化研判卡片） */
  onAnalysis?: (data: AnalysisPayload) => void;
}

export interface QueryStreamOptions {
  history?: { role: 'user' | 'assistant'; content: string }[];
  from?: string;
  modelId?: string;
  /** 服务端会话 id：传入后历史改由服务端加载与落库，不再回传 history（M2 步骤 9） */
  sessionId?: string;
}

/** 会话列表摘要（GET /chat/sessions） */
export interface ChatSessionSummary {
  id: string;
  type: 'chat' | 'agent';
  from: string;
  title: string;
  messageCount: number;
  createdAt: string;
  updatedAt: string;
}

/** 会话详情（GET /chat/sessions/:id，messages 为服务端存储的 role/content） */
export interface ChatSessionDetail {
  _id: string;
  type: 'chat' | 'agent';
  title: string;
  messages: { role: 'user' | 'assistant'; content: string }[];
  createdAt: string;
  updatedAt: string;
}

export type ChatSessionMessage = Pick<ChatMessage, 'role' | 'content'>;

@Injectable({ providedIn: 'root' })
export class ChatApi extends _BaseApi {
  constructor(
    http: HttpService,
    private readonly storage: StorageService,
  ) {
    super(http);
  }

  queryStream(question: string, callbacks: QueryStreamCallbacks, options?: QueryStreamOptions): () => void {
    const { history, from, modelId, sessionId } = options || {};
    return fetchSSEStream(callbacks as SSEStreamHandlers, {
      url: `${env.baseUrl}/chat/stream`,
      body: {
        question,
        history,
        from,
        ...(modelId ? { modelId } : {}),
        ...(sessionId ? { sessionId } : {}),
      },
      token: this.storage.token,
      format: 'typed',
    });
  }

  /** Agent 模式流式查询 — 请求 /agent/stream 端点 */
  queryAgentStream(question: string, callbacks: QueryStreamCallbacks, options?: QueryStreamOptions): () => void {
    const { history, from, modelId, sessionId } = options || {};
    return fetchSSEStream(callbacks as SSEStreamHandlers, {
      url: `${env.baseUrl}/agent/stream`,
      body: {
        question,
        history,
        from,
        ...(modelId ? { modelId } : {}),
        ...(sessionId ? { sessionId } : {}),
      },
      token: this.storage.token,
      format: 'typed',
    });
  }

  /** AI 研判流式查询 — 请求 /alert-analyzer/stream（analysis 事件渲染研判卡片） */
  analyzeStream(
    dto: { question?: string; autoRun?: boolean; commandId?: string; tfid?: string },
    callbacks: QueryStreamCallbacks,
  ): () => void {
    return fetchSSEStream(callbacks as SSEStreamHandlers, {
      url: `${env.baseUrl}/alert-analyzer/stream`,
      body: {
        ...(dto.question ? { question: dto.question } : {}),
        ...(dto.autoRun !== undefined ? { autoRun: dto.autoRun } : {}),
        ...(dto.commandId ? { commandId: dto.commandId } : {}),
        ...(dto.tfid ? { tfid: dto.tfid } : {}),
      },
      token: this.storage.token,
      format: 'typed',
    });
  }

  /** 创建服务端会话（type: chat=普通对话 / agent=指挥 Agent；title 由服务端自动生成） */
  createSession(
    type: 'chat' | 'agent',
    messages: ChatSessionMessage[] = [],
    from: 'cocc' | 'library' | 'manager' = 'cocc',
  ): Promise<ChatSessionDetail> {
    return this.http.postSilent('/chat/sessions', {
      type,
      from,
      ...(messages.length ? { messages } : {}),
    });
  }

  /** 当前用户的会话列表（按最近更新倒序；失败静默，调用方自行兜底） */
  listSessions(type?: 'chat' | 'agent', from?: 'cocc' | 'library' | 'manager'): Promise<ChatSessionSummary[]> {
    const query = { ...(type ? { type } : {}), ...(from ? { from } : {}) };
    return this.http.getSilent('/chat/sessions', Object.keys(query).length ? query : undefined);
  }

  /** 会话详情（含服务端存储的消息列表；失败静默） */
  getSession(id: string): Promise<ChatSessionDetail> {
    return this.http.getSilent(`/chat/sessions/${id}`);
  }

  /** 删除会话（清空对话时调用，尽力而为：失败仅留下孤儿会话，不影响使用） */
  deleteSession(id: string): Promise<{ code: number }> {
    return this.http.deleteSilent(`/chat/sessions/${id}`);
  }
}
