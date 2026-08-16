import {
  AfterViewChecked,
  Component,
  effect,
  ElementRef,
  OnDestroy,
  signal,
  ViewChild,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MarkdownComponent } from 'ngx-markdown';
import { LibraryNzModule } from '../../../library.nz.module';
import { LibraryChatService } from '../library-chat.service';
import { StickToBottom } from '../../../shared/scroll-bottom';

const STEPS = [
  { stage: 'classifying', label: '理解问题' },
  { stage: 'fetching', label: '检索知识库' },
  { stage: 'generating', label: '生成回答' },
] as const;

const STAGE_ORDER = ['classifying', 'fetching', 'generating'];

@Component({
  selector: 'library-agent',
  standalone: true,
  imports: [LibraryNzModule, FormsModule, MarkdownComponent],
  providers: [LibraryChatService],
  templateUrl: './library-agent.component.html',
  styleUrl: './library-agent.component.less',
})
export class LibraryAgentComponent implements AfterViewChecked, OnDestroy {
  @ViewChild('messageList') messageListRef!: ElementRef;
  @ViewChild('inputRef') inputRef!: ElementRef;
  @ViewChild('scrollAnchor') scrollAnchor!: ElementRef;

  isOpen = signal(false);
  isHover = signal(false);
  showHistory = signal(false);
  showThinking = signal(true);
  inputText = '';
  steps = STEPS;

  /** 待执行的滚动动作：'stick'=跟随输出，'jump'=强制到底。 */
  private pendingScroll: 'stick' | 'jump' | null = null;
  private readonly stick = new StickToBottom();
  /** 是否显示「回到底部」按钮（即处于暂停跟随）。 */
  showJumpButton = signal(false);
  /** 触摸滑动起点 Y，用于判断手指上滑。 */
  private lastTouchY: number | null = null;

  constructor(readonly chat: LibraryChatService) {
    // 内容变化默认跟随；不覆盖待执行的强制滚动（jump），保证切换会话/发送能强制到底
    effect(() => {
      this.chat.activeMessages; // subscribe
      this.chat.loading();
      if (this.pendingScroll !== 'jump') {
        this.pendingScroll = 'stick';
      }
    });
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
    this.chat.stop();
    this.stick.dispose();
  }

  togglePanel() {
    this.isOpen.update((v) => !v);
    if (!this.isOpen()) {
      this.showHistory.set(false);
    } else {
      this.pendingScroll = 'jump';
      setTimeout(() => this.inputRef?.nativeElement?.focus(), 300);
    }
  }

  onNewSession() {
    this.chat.createSession();
    this.showHistory.set(false);
    this.pendingScroll = 'jump';
    setTimeout(() => this.inputRef?.nativeElement?.focus(), 300);
  }

  onSelectSession(id: string) {
    this.chat.switchSession(id);
    this.showHistory.set(false);
    this.pendingScroll = 'jump';
  }

  onInput(event: Event) {
    this.inputText = (event.target as HTMLInputElement).value;
  }

  onSend() {
    if (!this.inputText.trim() || this.chat.loading()) return;
    this.chat.sendMessage(this.inputText);
    this.inputText = '';
    this.pendingScroll = 'jump';
  }

  onKeydown(event: KeyboardEvent) {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      this.onSend();
    }
  }

  toggleThinking() {
    this.showThinking.update((v) => !v);
  }

  get statusLabel(): string {
    const stage = this.chat.stage();
    if (!stage) return '正在思考';
    const step = this.steps.find((s) => s.stage === stage);
    return step ? `正在${step.label}` : '正在思考';
  }

  isStepDone(stepStage: string): boolean {
    const currentIdx = STAGE_ORDER.indexOf(this.chat.stage());
    const stepIdx = STAGE_ORDER.indexOf(stepStage);
    return currentIdx > stepIdx;
  }
}
