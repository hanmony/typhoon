import {
  Component,
  signal,
  ViewChild,
  ElementRef,
  AfterViewChecked,
  OnInit,
  OnDestroy,
  Input,
  Output,
  EventEmitter,
  ViewEncapsulation,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MarkdownComponent } from 'ngx-markdown';
import { CommonNzModule } from '../../common.nz.module';
import { ChatApi, ChatMessage, ChatSessionDetail, ThinkingRound, ToolEventData, UsageEventData } from '../../services/apis/chat';
import { buildChatHistory } from '../../services/apis/chat-history';
import { StorageService } from '../../services/storage.service';
import { NzMessageService } from 'ng-zorro-antd/message';
import { StickToBottom } from '../../shared/scroll-bottom';

const WELCOME_CONTENT = '你好！我是防汛智策助手，有什么可以帮助你的吗？';

const MAX_HISTORY_ROUNDS = 5;

const TOOL_DISPLAY_NAMES: Record<string, string> = {
  get_current_status: '当前状态',
  get_operations: '运营事件',
  search_documents: '知识库文档',
  get_typhoon_history: '历史台风',
  get_duty_info: '值班信息',
  get_messages: '指挥消息',
  get_severe_weather_history: '预警历史',
  get_patrolling_tours: '巡道记录',
};

interface StepItem {
  label: string;
  done: boolean;
}

@Component({
  selector: 'app-chat-panel',
  standalone: true,
  imports: [CommonNzModule, FormsModule, MarkdownComponent],
  templateUrl: './chat-panel.component.html',
  styleUrl: './chat-panel.component.less',
  encapsulation: ViewEncapsulation.None,
})
export class ChatPanelComponent implements OnInit, AfterViewChecked, OnDestroy {
  @ViewChild('messageList') messageListRef!: ElementRef;
  @Input() width = 400;
  @Output() closeEvent = new EventEmitter<void>();

  messages = signal<ChatMessage[]>([]);
  inputText = '';
  loading = false;
  statusText = '';
  showThinking = signal(true);
  agentMode = signal(false);
  steps = signal<StepItem[]>([]);

  isFirstUndone(index: number): boolean {
    const s = this.steps();
    for (let i = 0; i < s.length; i++) {
      if (!s[i].done) return i === index;
    }
    return false;
  }

  private cancelStream: (() => void) | null = null;
  /** 待执行的滚动动作：'stick'=跟随输出，'jump'=强制到底。ngAfterViewChecked 消费后清空。 */
  private pendingScroll: 'stick' | 'jump' | null = null;
  private readonly stick = new StickToBottom();
  /** 是否显示「回到底部」按钮（即处于暂停跟随）。 */
  showJumpButton = signal(false);
  /** 触摸滑动起点 Y，用于判断手指上滑。 */
  private lastTouchY: number | null = null;
  /** 服务端会话 id：chat 与 agent 各自独立；null=尚未建立（下次发送时自动创建） */
  private chatSessionId: string | null = null;
  private agentSessionId: string | null = null;
  /** 会话加载请求序号：防止模式快速切换时过期响应覆盖新会话 */
  private sessionLoadSeq = 0;
  /** localStorage 历史 key（服务端不可用时的回退存储，始终镜像最近历史） */
  private historyKey = '';
  private readonly agentModeKey = 'cocc-agent-mode';
  private pendingThinking = '';

  constructor(
    private readonly chatApi: ChatApi,
    private readonly storage: StorageService,
    private readonly msg: NzMessageService,
  ) {}

  ngOnInit() {
    this.historyKey = `cocc-chat-history-${this.getUserId()}`;
    this.messages.set([
      {
        role: 'assistant',
        content: WELCOME_CONTENT,
      },
    ]);
    this.loadAgentMode();
    // 历史迁移到服务端会话：优先加载服务端最新会话，失败回退 localStorage
    void this.loadServerSession('chat');
  }

  ngAfterViewChecked() {
    if (!this.pendingScroll) return;
    const el = this.messageListRef?.nativeElement;
    if (!el) return;
    if (this.pendingScroll === 'jump') {
      this.stick.jumpToBottom(el);
    } else {
      this.stick.stick(el);
    }
    this.pendingScroll = null;
    this.showJumpButton.set(this.stick.paused);
  }

  /** 消息区 scroll 事件：更新贴底状态与「回到底部」按钮显隐。 */
  onListScroll() {
    const el = this.messageListRef?.nativeElement;
    if (!el) return;
    this.stick.onScroll(el);
    this.showJumpButton.set(this.stick.paused);
  }

  /** 滚轮向上（看历史）→ 暂停跟随。 */
  onWheel(event: WheelEvent) {
    if (event.deltaY < 0) {
      this.stick.onUserScrollUp();
      this.showJumpButton.set(true);
    }
  }

  /** 触摸开始：记录起点。 */
  onTouchStart(event: TouchEvent) {
    this.lastTouchY = event.touches[0]?.clientY ?? null;
  }

  /** 触摸移动：手指上滑 → 暂停跟随。 */
  onTouchMove(event: TouchEvent) {
    const y = event.touches[0]?.clientY ?? null;
    if (this.lastTouchY !== null && y !== null && y < this.lastTouchY) {
      this.stick.onUserScrollUp();
      this.showJumpButton.set(true);
    }
    this.lastTouchY = y;
  }

  /** 点击「回到底部」按钮：平滑回到底部并恢复跟随。 */
  onJumpToBottom() {
    const el = this.messageListRef?.nativeElement;
    if (!el) return;
    this.stick.jumpToBottom(el, true);
    this.showJumpButton.set(false);
  }

  ngOnDestroy() {
    this.cancelStream?.();
    this.cancelStream = null;
    this.stick.dispose();
  }

  onSend() {
    const question = this.inputText.trim();
    if (!question || this.loading) return;

    this.inputText = '';
    this.messages.update(msgs => [...msgs, { role: 'user', content: question }]);
    this.messages.update(msgs => [...msgs, { role: 'assistant', content: '', streaming: true }]);
    this.loading = true;
    this.pendingScroll = 'jump';
    this.statusText = '';
    this.pendingThinking = '';

    // Agent 模式初始化动态步进
    if (this.agentMode()) {
      this.steps.set([{ label: '理解问题', done: false }]);
    } else {
      this.steps.set([]);
    }

    void this.sendStream(question);
  }

  /** 发起一轮问答：优先走服务端会话（sessionId），创建失败退回无状态（前端回传历史） */
  private async sendStream(question: string) {
    const currentMessages = this.messages();
    const assistantIndex = currentMessages.length - 1;
    const type = this.currentSessionType();

    // 服务端会话：不存在则创建；创建失败退回无状态模式（历史由前端回传 + localStorage 回退保存）
    let sessionId = this.currentSessionId();
    if (!sessionId) {
      try {
        const created = await this.chatApi.createSession(type);
        sessionId = created._id;
        this.setSessionId(type, sessionId);
      } catch {
        this.msg.warning('会话创建失败，本轮对话仅保存在本地');
      }
    }
    // 等待创建期间模式已切换：本轮作废，避免消息串到另一个会话
    if (this.currentSessionType() !== type) {
      this.loading = false;
      return;
    }

    let firstToken = true;
    const thinkingRounds: ThinkingRound[] = [];

    const finalizeThinking = (label: string) => {
      if (this.pendingThinking) {
        thinkingRounds.push({ label, content: this.pendingThinking });
        this.pendingThinking = '';
        this.messages.update(msgs => {
          const updated = [...msgs];
          updated[assistantIndex] = {
            ...updated[assistantIndex],
            thinkingRounds: [...thinkingRounds],
          };
          return updated;
        });
        this.pendingScroll = 'stick';
      }
    };

    const callbacks = {
      onToken: token => {
        // 第一个 token：完成前序步骤，追加"生成回答"
        if (firstToken) {
          this.steps.update(s => {
            const copy = s.map(st => ({ ...st, done: true }));
            copy.push({ label: '生成回答', done: false });
            return copy;
          });
          finalizeThinking('组织回答');
          firstToken = false;
        }
        this.statusText = '';
        this.messages.update(msgs => {
          const updated = [...msgs];
          updated[assistantIndex] = {
            ...updated[assistantIndex],
            content: updated[assistantIndex].content + token,
          };
          return updated;
        });
        this.pendingScroll = 'stick';
      },
      onError: err => {
        // 服务端会话已不存在（如被其他端删除）：置空，下次发送自动重建
        if (/会话不存在|无权访问/.test(err.message)) {
          this.setSessionId(this.currentSessionType(), null);
        }
        this.messages.update(msgs => {
          const updated = [...msgs];
          updated[assistantIndex] = {
            ...updated[assistantIndex],
            content: updated[assistantIndex].content || `请求失败: ${err.message}`,
            streaming: false,
          };
          return updated;
        });
        this.loading = false;
        this.statusText = '';
        this.steps.set([]);
        this.msg.error(`请求失败: ${err.message}`);
        // 双写：localStorage 始终镜像最近历史，服务端不可用时可直接回退
        this.saveHistory();
      },
      onComplete: () => {
        this.messages.update(msgs => {
          const updated = [...msgs];
          updated[assistantIndex] = { ...updated[assistantIndex], streaming: false };
          return updated;
        });
        this.loading = false;
        this.statusText = '';
        this.steps.set([]);
        // 会话模式下服务端已自动落库；localStorage 镜像保留作为回退
        this.saveHistory();
      },
      onStatus: status => {
        this.statusText = status.replace(/\.\.\.+$/, '');
      },
      onStage: _stage => {
        // stage 事件保留接口兼容，步进由事件类型驱动
      },
      onThinking: thinking => {
        this.statusText = '';
        this.pendingThinking += thinking;
        this.messages.update(msgs => {
          const updated = [...msgs];
          updated[assistantIndex] = {
            ...updated[assistantIndex],
            thinkingRounds: [...thinkingRounds, { label: '', content: this.pendingThinking }],
          };
          return updated;
        });
        this.pendingScroll = 'stick';
      },
      onTool: (data: ToolEventData) => {
        const displayName = TOOL_DISPLAY_NAMES[data.name] || data.name;
        if (data.status === 'executing') {
          // 完成前序步骤，追加工具步骤
          finalizeThinking(`${displayName} · 分析`);
          this.steps.update(s => {
            const copy = s.map(st => ({ ...st, done: true }));
            copy.push({ label: `查询${displayName}`, done: false });
            return copy;
          });
          this.statusText = `正在查询${displayName}...`;
        } else if (data.status === 'done') {
          this.steps.update(s => {
            const copy = [...s];
            if (copy.length > 0) copy[copy.length - 1] = { ...copy[copy.length - 1], done: true };
            return copy;
          });
          this.statusText = `${displayName}查询完成`;
        } else if (data.status === 'error') {
          this.statusText = `${displayName}查询失败`;
        }
      },
      onUsage: (data: UsageEventData) => {
        this.messages.update(msgs => {
          const updated = [...msgs];
          updated[assistantIndex] = {
            ...updated[assistantIndex],
            usage: data,
          };
          return updated;
        });
      },
    };

    // 有会话 → 服务端管理历史；无会话（创建失败回退）→ 前端回传历史（保持原有无状态行为）
    const options = sessionId ? { sessionId } : { history: this.buildHistory() };
    if (this.agentMode()) {
      this.cancelStream = this.chatApi.queryAgentStream(question, callbacks, options);
    } else {
      this.cancelStream = this.chatApi.queryStream(question, callbacks, options);
    }
  }

  onStop() {
    if (this.cancelStream) {
      this.cancelStream();
      this.cancelStream = null;
    }
    this.loading = false;
    this.statusText = '';
    this.steps.set([]);
    this.pendingThinking = '';
    this.messages.update(msgs => {
      const updated = [...msgs];
      const last = updated[updated.length - 1];
      if (last?.streaming) {
        updated[updated.length - 1] = { ...last, streaming: false };
      }
      return updated;
    });
  }

  onKeydown(event: KeyboardEvent) {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      this.onSend();
    }
  }

  toggleThinking() {
    this.showThinking.update(v => !v);
  }

  toggleAgentMode() {
    const next = !this.agentMode();
    this.agentMode.set(next);
    localStorage.setItem(this.agentModeKey, next ? 'agent' : 'chat');
    // 流式输出中切换模式：先停止当前流，避免输出串到另一个会话的消息列表
    if (this.loading) {
      this.onStop();
    }
    // 切换模式 = 切换会话：加载对应类型的服务端最新会话
    void this.loadServerSession(next ? 'agent' : 'chat');
  }

  onClear() {
    this.messages.set([
      {
        role: 'assistant',
        content: WELCOME_CONTENT,
      },
    ]);
    this.onStop();
    // 清空面板属强制滚动场景：无视当前 sticky 状态重置贴底、隐藏「回到底部」按钮
    this.pendingScroll = 'jump';
    // 旧会话作废：置空 id（下次发送自动新建），并尽力删除服务端会话
    const oldId = this.currentSessionId();
    this.setSessionId(this.currentSessionType(), null);
    if (oldId) {
      this.chatApi.deleteSession(oldId).catch(() => {
        // 删除失败（离线等）：旧会话成为服务端孤儿，不影响后续使用
      });
    }
    localStorage.removeItem(this.historyKey);
  }

  private currentSessionType(): 'chat' | 'agent' {
    return this.agentMode() ? 'agent' : 'chat';
  }

  private currentSessionId(): string | null {
    return this.agentMode() ? this.agentSessionId : this.chatSessionId;
  }

  private setSessionId(type: 'chat' | 'agent', id: string | null) {
    if (type === 'chat') {
      this.chatSessionId = id;
    } else {
      this.agentSessionId = id;
    }
  }

  /** 从服务端加载指定类型的最新会话（历史优先服务端，不可用时回退 localStorage） */
  private async loadServerSession(type: 'chat' | 'agent') {
    const seq = ++this.sessionLoadSeq;
    let session: ChatSessionDetail | null = null;
    let failed = false;
    try {
      const list = await this.chatApi.listSessions(type);
      if (list.length > 0) {
        session = await this.chatApi.getSession(list[0].id);
      }
    } catch {
      // 未登录或服务端/MongoDB 不可用：回退 localStorage 历史（迁移前的旧行为）
      failed = true;
    }
    // 过期响应（模式又切换了）直接丢弃，避免旧会话消息覆盖当前会话
    if (seq !== this.sessionLoadSeq || this.currentSessionType() !== type) return;
    if (failed) {
      this.setSessionId(type, null);
      this.loadHistory();
      return;
    }
    this.setSessionId(type, session?._id ?? null);
    this.messages.set(
      session
        ? [
            { role: 'assistant', content: WELCOME_CONTENT },
            ...session.messages.map(m => ({ role: m.role, content: m.content })),
          ]
        : [{ role: 'assistant', content: WELCOME_CONTENT }],
    );
    this.pendingScroll = 'jump';
  }

  private buildHistory() {
    return buildChatHistory(this.messages(), MAX_HISTORY_ROUNDS);
  }

  private getUserId(): string {
    try {
      const token = this.storage.token;
      if (token) {
        const payload = JSON.parse(atob(token.split('.')[1]));
        return payload.sub || payload.userId || 'anonymous';
      }
    } catch {}
    return 'anonymous';
  }

  /** localStorage 历史（服务端不可用时的回退数据源；空数据时回落到欢迎语） */
  private loadHistory() {
    try {
      const raw = localStorage.getItem(this.historyKey);
      if (raw) {
        const parsed = JSON.parse(raw) as ChatMessage[];
        if (Array.isArray(parsed) && parsed.length > 0) {
          this.messages.set(parsed.map(m => ({ ...m, streaming: false })));
          this.pendingScroll = 'jump';
          return;
        }
      }
    } catch {}
    this.messages.set([{ role: 'assistant', content: WELCOME_CONTENT }]);
    this.pendingScroll = 'jump';
  }

  /** localStorage 镜像保存：服务端模式与回退模式都写，保证任何时刻可降级 */
  private saveHistory() {
    const msgs = this.messages()
      .filter(m => m.content)
      .map(({ role, content, thinking, thinkingRounds, usage }) => {
        const entry: any = { role, content };
        if (thinking) entry.thinking = thinking;
        if (thinkingRounds?.length) entry.thinkingRounds = thinkingRounds;
        if (usage) entry.usage = usage;
        return entry;
      });
    localStorage.setItem(this.historyKey, JSON.stringify(msgs));
  }

  private loadAgentMode() {
    try {
      const saved = localStorage.getItem(this.agentModeKey);
      this.agentMode.set(saved === 'agent');
    } catch {}
  }
}
