import { Component, signal, ViewChild, ElementRef, AfterViewChecked, OnInit, OnDestroy, ViewEncapsulation } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MarkdownComponent } from 'ngx-markdown';
import { CommonNzModule } from '../../../common.nz.module';
import { KnowledgeBaseApi } from '../../../services/apis/knowledge-base';
import { NzMessageService } from 'ng-zorro-antd/message';
import { buildChatHistory } from '../../../services/apis/chat-history';

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  thinking?: string;
  thinkingCollapsed?: boolean;
  sources?: { content: string; documentName: string; score: number }[];
  streaming?: boolean;
}

const HISTORY_KEY = 'ai-chat-history';
const MAX_HISTORY_ROUNDS = 5;

@Component({
  selector: 'app-ai-chat',
  imports: [CommonNzModule, FormsModule, MarkdownComponent],
  templateUrl: './ai-chat.component.html',
  styleUrl: './ai-chat.component.less',
  encapsulation: ViewEncapsulation.None,
})
export class AiChatComponent implements OnInit, AfterViewChecked, OnDestroy {
  @ViewChild('messageList') messageListRef!: ElementRef;

  messages = signal<ChatMessage[]>([]);
  inputText = '';
  loading = false;
  statusText = '';
  selectedCategory: string | undefined = undefined;
  showThinking = signal(true);
  private cancelStream: (() => void) | null = null;
  private shouldScroll = false;
  private pendingSources: any[] | null = null;

  constructor(
    private readonly kbApi: KnowledgeBaseApi,
    private readonly msg: NzMessageService,
  ) {}

  ngOnInit() {
    this.loadHistory();
  }

  ngAfterViewChecked() {
    if (this.shouldScroll) {
      this.scrollToBottom();
      this.shouldScroll = false;
    }
    this.decorateSourceRefs();
  }

  ngOnDestroy() {
    this.cancelStream?.();
    this.cancelStream = null;
  }

  async onSend() {
    const question = this.inputText.trim();
    if (!question || this.loading) return;

    this.inputText = '';
    this.messages.update(msgs => [...msgs, { role: 'user', content: question }]);
    this.messages.update(msgs => [...msgs, { role: 'assistant', content: '', streaming: true }]);
    this.loading = true;
    this.shouldScroll = true;
    this.statusText = '正在检索知识库';

    const currentMessages = this.messages();
    const assistantIndex = currentMessages.length - 1;

    const history = this.buildHistory();

    this.cancelStream = this.kbApi.queryStream(
      question,
      5,
      token => {
        this.statusText = '';
        this.messages.update(msgs => {
          const updated = [...msgs];
          updated[assistantIndex] = {
            ...updated[assistantIndex],
            content: updated[assistantIndex].content + token,
          };
          return updated;
        });
        this.shouldScroll = true;
      },
      err => {
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
        this.msg.error(`请求失败: ${err.message}`);
        this.saveHistory();
      },
      () => {
        this.messages.update(msgs => {
          const updated = [...msgs];
          updated[assistantIndex] = {
            ...updated[assistantIndex],
            streaming: false,
            sources: this.pendingSources || updated[assistantIndex].sources,
          };
          return updated;
        });
        this.pendingSources = null;
        this.loading = false;
        this.statusText = '';
        this.saveHistory();
      },
      this.selectedCategory,
      sources => {
        this.pendingSources = sources;
      },
      history,
      thinking => {
        this.messages.update(msgs => {
          const updated = [...msgs];
          updated[assistantIndex] = {
            ...updated[assistantIndex],
            thinking: (updated[assistantIndex].thinking || '') + thinking,
          };
          return updated;
        });
        this.shouldScroll = true;
      },
    );
  }

  onStop() {
    if (this.cancelStream) {
      this.cancelStream();
      this.cancelStream = null;
    }
    this.loading = false;
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

  onClear() {
    this.messages.set([]);
    this.onStop();
    localStorage.removeItem(HISTORY_KEY);
  }

  onMessageClick(event: MouseEvent) {
    const target = event.target as HTMLElement;
    if (target.classList.contains('source-ref')) {
      const index = target.getAttribute('data-index');
      if (index) {
        const messageEl = target.closest('.message');
        const el = messageEl?.querySelector(`[data-source-index="${index}"]`);
        if (el) {
          el.scrollIntoView({ behavior: 'smooth', block: 'center' });
          el.classList.add('source-highlight');
          setTimeout(() => el.classList.remove('source-highlight'), 2000);
        }
      }
    }
  }

  private decorateSourceRefs() {
    const container = this.messageListRef?.nativeElement;
    if (!container) return;

    const bubbles = container.querySelectorAll('.assistant-bubble');
    for (const bubble of bubbles) {
      this.decorateElement(bubble as HTMLElement);
    }
  }

  private decorateElement(container: HTMLElement) {
    const walker = document.createTreeWalker(container, NodeFilter.SHOW_TEXT);
    const textNodes: Text[] = [];
    while (walker.nextNode()) textNodes.push(walker.currentNode as Text);

    for (const node of textNodes) {
      const text = node.textContent;
      if (!text || !/\[(?:来源)?\d+\]/.test(text)) continue;
      if (node.parentElement?.classList.contains('source-ref')) continue;

      const frag = document.createDocumentFragment();
      const parts = text.split(/(\[(?:来源)?\d+\])/g);
      for (const part of parts) {
        const match = part.match(/^\[(?:来源)?(\d+)\]$/);
        if (match) {
          const span = document.createElement('span');
          span.className = 'source-ref';
          span.setAttribute('data-index', match[1]);
          span.title = `查看来源 ${part}`;
          span.textContent = part;
          frag.appendChild(span);
        } else {
          frag.appendChild(document.createTextNode(part));
        }
      }
      node.parentNode?.replaceChild(frag, node);
    }
  }

  getReferencedSources(msg: ChatMessage) {
    if (!msg.sources?.length || !msg.content) return [];
    const indices = new Set<number>();
    for (const m of msg.content.matchAll(/\[(?:来源)?(\d+)\]/g)) {
      indices.add(parseInt(m[1], 10));
    }
    if (indices.size === 0) return [];
    return msg.sources
      .map((s, i) => ({ source: s, num: i + 1 }))
      .filter(item => indices.has(item.num));
  }

  private loadHistory() {
    try {
      const raw = localStorage.getItem(HISTORY_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as ChatMessage[];
        if (Array.isArray(parsed) && parsed.length > 0) {
          this.messages.set(parsed.map(m => ({ ...m, streaming: false })));
          this.shouldScroll = true;
        }
      }
    } catch {}
  }

  private saveHistory() {
    const msgs = this.messages().map(({ role, content, sources }) => ({ role, content, sources }));
    localStorage.setItem(HISTORY_KEY, JSON.stringify(msgs));
  }

  private buildHistory() {
    return buildChatHistory(this.messages(), MAX_HISTORY_ROUNDS);
  }

  private scrollToBottom() {
    try {
      const el = this.messageListRef?.nativeElement;
      if (el) el.scrollTop = el.scrollHeight;
    } catch {}
  }
}
