/**
 * SSE 流式解析工具 — 统一 ChatApi / KnowledgeBaseApi 的 SSE 解析逻辑
 */

export interface ToolEventData {
  name: string;
  status: 'executing' | 'done' | 'error';
  result?: string;
}

export interface UsageEventData {
  prompt_tokens: number;
  completion_tokens: number;
  total_tokens: number;
}

/** AI 研判（alert-analyzer）analysis 事件的结构化数据（研判卡片） */
export interface AnalysisLineImpact {
  line: string;
  period?: string;
  riskLevel?: string;
}

export interface AnalysisSimilarCase {
  caseId: string;
  caseName: string;
  score: number;
  reason?: string;
}

export interface AnalysisBasis {
  mode: 'simulated' | 'realtime';
  queryTime: string;
  stateTime?: string;
  stale?: boolean;
}

export interface AnalysisPayload {
  basis?: AnalysisBasis;
  affectedLines?: AnalysisLineImpact[];
  levelSuggestion?: string | null;
  similarCases?: AnalysisSimilarCase[];
}

export interface SSEStreamHandlers {
  onToken: (data: string) => void;
  onError: (err: Error) => void;
  onComplete: () => void;
  /** ChatApi 专用：status + stage 事件 */
  onStatus?: (status: string) => void;
  onStage?: (stage: string) => void;
  /** ChatApi / KBApi 共用：thinking 事件 */
  onThinking?: (thinking: string) => void;
  /** KBApi 专用：sources 事件 */
  onSources?: (sources: unknown[]) => void;
  /** AgentApi 专用：tool call 事件 */
  onTool?: (data: ToolEventData) => void;
  /** Chat / Agent 共用：usage 事件（token 用量统计） */
  onUsage?: (data: UsageEventData) => void;
  /** AlertAnalyzerApi 专用：analysis 事件（研判卡片结构化数据） */
  onAnalysis?: (data: AnalysisPayload) => void;
}

export interface SSEStreamOptions {
  url: string;
  body: Record<string, unknown>;
  token: string | undefined;
  timeout?: number;
  /** SSE 数据格式：'typed' = ChatApi（data.type 分发），'flat' = KBApi（data.content 分发） */
  format: 'typed' | 'flat';
}

export function fetchSSEStream(
  handlers: SSEStreamHandlers,
  options: SSEStreamOptions,
): () => void {
  const { onToken, onError, onComplete, onStatus, onStage, onThinking, onSources, onTool, onUsage, onAnalysis } = handlers;
  const { url, body, token, timeout = 60_000, format } = options;

  const controller = new AbortController();
  let timeoutId = setTimeout(() => controller.abort(), timeout);
  const resetTimeout = () => {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => controller.abort(), timeout);
  };

  (async () => {
    try {
      const resp = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify(body),
        signal: controller.signal,
      });

      if (!resp.ok) {
        const err = await resp.json().catch(() => ({ message: resp.statusText }));
        throw new Error(err.message || 'Stream request failed');
      }

      const reader = resp.body!.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      let currentEvent = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        resetTimeout();
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          const trimmed = line.trim();
          // 空白行 = SSE 事件边界，重置事件名
          if (!trimmed) {
            currentEvent = '';
            continue;
          }

          if (trimmed === 'data: [DONE]') {
            clearTimeout(timeoutId);
            onComplete();
            return;
          }

          // 识别 SSE 标准 event: 行（用于 event: error 等协议层信号）
          if (trimmed.startsWith('event: ')) {
            currentEvent = trimmed.slice(7).trim();
            continue;
          }

          if (trimmed.startsWith('data: ')) {
            const dataStr = trimmed.slice(6);
            // 协议层 error 事件：抛给 onError 回调并中止流
            if (currentEvent === 'error') {
              clearTimeout(timeoutId);
              const message = (() => {
                try {
                  const parsed = JSON.parse(dataStr);
                  return parsed.message || dataStr;
                } catch {
                  return dataStr;
                }
              })();
              onError(new Error(message));
              return;
            }
            try {
              const data = JSON.parse(dataStr);
              dispatchSSEEvent(data, format, {
                onToken,
                onStatus,
                onStage,
                onThinking,
                onSources,
                onTool,
                onUsage,
                onAnalysis,
              });
            } catch (e) {
              if (e instanceof SyntaxError) continue;
              throw e;
            }
          }
        }
      }

      clearTimeout(timeoutId);
      onComplete();
    } catch (err) {
      clearTimeout(timeoutId);
      if ((err as Error).name !== 'AbortError') {
        onError(err as Error);
      } else {
        onError(new Error('请求超时，请稍后重试'));
      }
    }
  })();

  return () => { clearTimeout(timeoutId); controller.abort(); };
}

/** ChatApi SSE 事件（data.type 分发） */
interface TypedSSEEvent {
  type: 'status' | 'thinking' | 'token' | 'tool' | 'usage' | 'analysis';
  data: string | ToolEventData | UsageEventData | AnalysisPayload;
  stage?: string;
}

/** KBApi SSE 事件（data.content / data.sources 分发） */
interface FlatSSEEvent {
  content?: string;
  sources?: unknown[];
  type?: string;
  data?: string;
  error?: string;
}

type SSEEventData = TypedSSEEvent | FlatSSEEvent;

function isTypedEvent(data: SSEEventData): data is TypedSSEEvent {
  return (
    'type' in data &&
    (data.type === 'status' ||
      data.type === 'thinking' ||
      data.type === 'token' ||
      data.type === 'tool' ||
      data.type === 'usage' ||
      data.type === 'analysis')
  );
}

function dispatchSSEEvent(
  data: SSEEventData,
  format: 'typed' | 'flat',
  handlers: Pick<SSEStreamHandlers, 'onToken' | 'onStatus' | 'onStage' | 'onThinking' | 'onSources' | 'onTool' | 'onUsage' | 'onAnalysis'>,
): void {
  if (format === 'typed') {
    if (!isTypedEvent(data)) return;
    if (data.type === 'status') {
      handlers.onStatus?.(data.data as string);
      if (data.stage) handlers.onStage?.(data.stage);
    } else if (data.type === 'thinking') {
      handlers.onThinking?.(data.data as string);
    } else if (data.type === 'token') {
      handlers.onToken(data.data as string);
    } else if (data.type === 'tool') {
      handlers.onTool?.(data.data as ToolEventData);
    } else if (data.type === 'usage') {
      handlers.onUsage?.(data.data as UsageEventData);
    } else if (data.type === 'analysis') {
      handlers.onAnalysis?.(data.data as AnalysisPayload);
    }
  } else {
    if ('sources' in data && data.sources && handlers.onSources) {
      handlers.onSources(data.sources);
    } else if (data.type === 'thinking' && data.data) {
      handlers.onThinking?.(data.data as string);
    } else if ('content' in data && data.content) {
      handlers.onToken(data.content);
    } else if ('error' in data && data.error) {
      throw new Error(data.error);
    }
  }
}
