import { inject, Injectable, OnDestroy, signal } from '@angular/core';
import { NzMessageService } from 'ng-zorro-antd/message';
import { ChatApi, ChatMessage } from '../../services/apis/chat';
import { buildChatHistory } from '../../services/apis/chat-history';

export interface ChatSession {
  id: string;
  title: string;
  time: string;
  messages: ChatMessage[];
}

const WELCOME_CONTENT = '你好！我是台风案例库智能助手，有什么可以帮助你的？';
const DEFAULT_SESSION_TITLE = '新的对话';

@Injectable()
export class LibraryChatService implements OnDestroy {
  private readonly chatApi: ChatApi;

  sessions = signal<ChatSession[]>([]);
  activeSessionId = signal<string | null>(null);
  loading = signal(false);
  statusText = signal('');
  stage = signal('');

  private cancelStream: (() => void) | null = null;

  private readonly msg = inject(NzMessageService);

  constructor(chatApi: ChatApi) {
    this.chatApi = chatApi;
  }

  ngOnDestroy() {
    this.cancelStream?.();
    this.cancelStream = null;
  }

  get activeMessages(): ChatMessage[] {
    const sid = this.activeSessionId();
    if (!sid) return [];
    return this.sessions().find((s) => s.id === sid)?.messages ?? [];
  }

  createSession(): string {
    const id = `s_${Date.now()}`;
    const session: ChatSession = {
      id,
      title: DEFAULT_SESSION_TITLE,
      time: new Date().toLocaleString('zh-CN'),
      messages: [{ role: 'assistant', content: WELCOME_CONTENT }],
    };
    this.sessions.update((s) => [session, ...s]);
    this.activeSessionId.set(id);
    return id;
  }

  switchSession(id: string) {
    this.activeSessionId.set(id);
  }

  deleteSession(id: string, event: Event) {
    event.stopPropagation();
    this.sessions.update((s) => s.filter((x) => x.id !== id));
    if (this.activeSessionId() === id) {
      this.activeSessionId.set(null);
    }
  }

  sendMessage(content: string, modelId?: string) {
    if (!content.trim() || this.loading()) return;

    let sid = this.activeSessionId();
    if (!sid) {
      sid = this.createSession();
    }

    const userMsg: ChatMessage = { role: 'user', content: content.trim() };

    // Update session title if first user message
    this.sessions.update((sessions) =>
      sessions.map((s) => {
        if (s.id !== sid) return s;
        const title =
          s.messages.length <= 1
            ? content.trim().slice(0, 20) +
              (content.trim().length > 20 ? '...' : '')
            : s.title;
        return { ...s, title, messages: [...s.messages, userMsg] };
      }),
    );

    // Add placeholder assistant message
    const assistantMsg: ChatMessage = {
      role: 'assistant',
      content: '',
      streaming: true,
    };
    this.sessions.update((sessions) =>
      sessions.map((s) =>
        s.id === sid ? { ...s, messages: [...s.messages, assistantMsg] } : s,
      ),
    );

    this.loading.set(true);
    this.statusText.set('');
    this.stage.set('');

    const currentSession = this.sessions().find((s) => s.id === sid!);
    const assistantIndex = currentSession!.messages.length - 1;
    const history = this.buildHistory(sid!);

    this.cancelStream = this.chatApi.queryStream(
      content.trim(),
      {
        onToken: (token) => {
          this.statusText.set('');
          this.sessions.update((sessions) =>
            sessions.map((s) => {
              if (s.id !== sid) return s;
              const msgs = [...s.messages];
              msgs[assistantIndex] = {
                ...msgs[assistantIndex],
                content: msgs[assistantIndex].content + token,
              };
              return { ...s, messages: msgs };
            }),
          );
        },
        onError: (err) => {
          this.sessions.update((sessions) =>
            sessions.map((s) => {
              if (s.id !== sid) return s;
              const msgs = [...s.messages];
              msgs[assistantIndex] = {
                ...msgs[assistantIndex],
                content:
                  msgs[assistantIndex].content || `请求失败: ${err.message}`,
                streaming: false,
              };
              return { ...s, messages: msgs };
            }),
          );
          this.loading.set(false);
          this.statusText.set('');
          this.stage.set('');
          this.msg.error(`请求失败: ${err.message}`);
        },
        onComplete: () => {
          this.sessions.update((sessions) =>
            sessions.map((s) => {
              if (s.id !== sid) return s;
              const msgs = [...s.messages];
              msgs[assistantIndex] = {
                ...msgs[assistantIndex],
                streaming: false,
              };
              return { ...s, messages: msgs };
            }),
          );
          this.loading.set(false);
          this.statusText.set('');
          this.stage.set('');
        },
        onStatus: (status) => {
          this.statusText.set(status);
        },
        onStage: (stage) => {
          this.stage.set(stage);
        },
        onThinking: (thinking) => {
          this.statusText.set('');
          this.sessions.update((sessions) =>
            sessions.map((s) => {
              if (s.id !== sid) return s;
              const msgs = [...s.messages];
              msgs[assistantIndex] = {
                ...msgs[assistantIndex],
                thinking: (msgs[assistantIndex].thinking || '') + thinking,
              };
              return { ...s, messages: msgs };
            }),
          );
        },
      },
      { history, from: 'library', ...(modelId ? { modelId } : {}) },
    );
  }

  sendAgentMessage(content: string, modelId?: string) {
    if (!content.trim() || this.loading()) return;

    let sid = this.activeSessionId();
    if (!sid) {
      sid = this.createSession();
    }

    const userMsg: ChatMessage = { role: 'user', content: content.trim() };

    this.sessions.update((sessions) =>
      sessions.map((s) => {
        if (s.id !== sid) return s;
        const title =
          s.messages.length <= 1
            ? content.trim().slice(0, 20) +
              (content.trim().length > 20 ? '...' : '')
            : s.title;
        return { ...s, title, messages: [...s.messages, userMsg] };
      }),
    );

    const assistantMsg: ChatMessage = {
      role: 'assistant',
      content: '',
      streaming: true,
    };
    this.sessions.update((sessions) =>
      sessions.map((s) =>
        s.id === sid ? { ...s, messages: [...s.messages, assistantMsg] } : s,
      ),
    );

    this.loading.set(true);
    this.statusText.set('');
    this.stage.set('');

    const currentSession = this.sessions().find((s) => s.id === sid!);
    const assistantIndex = currentSession!.messages.length - 1;
    const history = this.buildHistory(sid!);

    this.cancelStream = this.chatApi.queryAgentStream(
      content.trim(),
      {
        onToken: (token) => {
          this.statusText.set('');
          this.sessions.update((sessions) =>
            sessions.map((s) => {
              if (s.id !== sid) return s;
              const msgs = [...s.messages];
              msgs[assistantIndex] = {
                ...msgs[assistantIndex],
                content: msgs[assistantIndex].content + token,
              };
              return { ...s, messages: msgs };
            }),
          );
        },
        onError: (err) => {
          this.sessions.update((sessions) =>
            sessions.map((s) => {
              if (s.id !== sid) return s;
              const msgs = [...s.messages];
              msgs[assistantIndex] = {
                ...msgs[assistantIndex],
                content:
                  msgs[assistantIndex].content || `请求失败: ${err.message}`,
                streaming: false,
              };
              return { ...s, messages: msgs };
            }),
          );
          this.loading.set(false);
          this.statusText.set('');
          this.stage.set('');
          this.msg.error(`请求失败: ${err.message}`);
        },
        onComplete: () => {
          this.sessions.update((sessions) =>
            sessions.map((s) => {
              if (s.id !== sid) return s;
              const msgs = [...s.messages];
              msgs[assistantIndex] = {
                ...msgs[assistantIndex],
                streaming: false,
              };
              return { ...s, messages: msgs };
            }),
          );
          this.loading.set(false);
          this.statusText.set('');
          this.stage.set('');
        },
        onStatus: (status) => {
          this.statusText.set(status);
        },
        onStage: (stage) => {
          this.stage.set(stage);
        },
        onThinking: (thinking) => {
          this.statusText.set('');
          this.sessions.update((sessions) =>
            sessions.map((s) => {
              if (s.id !== sid) return s;
              const msgs = [...s.messages];
              msgs[assistantIndex] = {
                ...msgs[assistantIndex],
                thinking: (msgs[assistantIndex].thinking || '') + thinking,
              };
              return { ...s, messages: msgs };
            }),
          );
        },
        onTool: (data) => {
          this.sessions.update((sessions) =>
            sessions.map((s) => {
              if (s.id !== sid) return s;
              const msgs = [...s.messages];
              const existing = msgs[assistantIndex].toolEvents || [];
              msgs[assistantIndex] = {
                ...msgs[assistantIndex],
                toolEvents: [...existing, data],
              };
              return { ...s, messages: msgs };
            }),
          );
        },
      },
      { history, from: 'library', ...(modelId ? { modelId } : {}) },
    );
  }

  stop() {
    if (this.cancelStream) {
      this.cancelStream();
      this.cancelStream = null;
    }
    this.loading.set(false);
    this.statusText.set('');
    this.stage.set('');
    // Mark last streaming message as done
    const sid = this.activeSessionId();
    if (sid) {
      this.sessions.update((sessions) =>
        sessions.map((s) => {
          if (s.id !== sid) return s;
          const msgs = [...s.messages];
          const last = msgs[msgs.length - 1];
          if (last?.streaming) {
            msgs[msgs.length - 1] = { ...last, streaming: false };
          }
          return { ...s, messages: msgs };
        }),
      );
    }
  }

  clearCurrent() {
    const sid = this.activeSessionId();
    if (!sid) return;
    this.stop();
    this.sessions.update((sessions) =>
      sessions.map((s) =>
        s.id === sid
          ? {
              ...s,
              messages: [{ role: 'assistant', content: WELCOME_CONTENT }],
            }
          : s,
      ),
    );
  }

  private buildHistory(
    sessionId: string,
  ): { role: 'user' | 'assistant'; content: string }[] {
    const session = this.sessions().find((s) => s.id === sessionId);
    if (!session) return [];
    return buildChatHistory(session.messages, 5);
  }
}
