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
import { ChatApi, ChatMessage, ThinkingRound, ToolEventData, UsageEventData } from '../../services/apis/chat';
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
    this.loadHistory();
    this.loadAgentMode();
    if (this.messages().length === 0) {
      this.messages.set([
        {
          role: 'assistant',
          content: WELCOME_CONTENT,
        },
      ]);
    }
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

    const currentMessages = this.messages();
    const assistantIndex = currentMessages.length - 1;
    const history = this.buildHistory();

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

    if (this.agentMode()) {
      this.cancelStream = this.chatApi.queryAgentStream(question, callbacks, { history });
    } else {
      this.cancelStream = this.chatApi.queryStream(question, callbacks, { history });
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
    this.agentMode.update(v => {
      const next = !v;
      localStorage.setItem(this.agentModeKey, next ? 'agent' : 'chat');
      return next;
    });
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
    localStorage.removeItem(this.historyKey);
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

  private loadHistory() {
    try {
      const raw = localStorage.getItem(this.historyKey);
      if (raw) {
        const parsed = JSON.parse(raw) as ChatMessage[];
        if (Array.isArray(parsed) && parsed.length > 0) {
          this.messages.set(parsed.map(m => ({ ...m, streaming: false })));
          this.pendingScroll = 'jump';
        }
      }
    } catch {}
  }

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

  private buildHistory() {
    return buildChatHistory(this.messages(), MAX_HISTORY_ROUNDS);
  }

  private loadAgentMode() {
    try {
      const saved = localStorage.getItem(this.agentModeKey);
      this.agentMode.set(saved === 'agent');
    } catch {}
  }
}
