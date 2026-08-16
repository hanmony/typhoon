/**
 * 聊天面板「跟随到底」滚动状态机（stick-to-bottom）。
 *
 * 行为：
 * - LLM 流式输出/新内容到达时，若用户当前贴底 → 自动滚到底部跟随；
 * - 用户主动上滑（滚轮/触摸向上）→ 暂停跟随，不打扰阅读历史；
 * - 用户滚回底部附近 → 恢复跟随；
 * - 发送消息 / 切换会话 / 打开面板 / 点击「回到底部」按钮 → 无视状态强制滚到底。
 *
 * 设计要点（为什么 onScroll 只恢复、不暂停）：
 *   流式输出时每个 token 都会程序滚动到底，而程序滚动冒泡的 scroll 事件是异步派发的——
 *   派发时新 token 往往已让内容继续增长，此时「距底」会 > 阈值。若 onScroll 据此把 isSticky
 *   设为 false，后续 stick 就不再滚动，表现为「流式时不滚动」。因此：
 *   - onScroll 只负责「滚回底部时恢复 isSticky=true」，绝不设 false；
 *   - 用户「上滑暂停」改由滚轮/触摸向上事件（onUserScrollUp）专门负责，立即置 false，
 *     既无竞态又即时。
 */
export class StickToBottom {
  /** 当前是否贴底。true=跟随输出；false=暂停（驱动「回到底部」按钮显隐）。 */
  isSticky = true;

  /**
   * @param threshold 距底多少 px 内视为「贴底」，默认 80px。留出缓冲避免像素级抖动。
   */
  constructor(private readonly threshold = 80) {}

  /** 是否处于暂停跟随状态（即应显示「回到底部」按钮）。 */
  get paused(): boolean {
    return !this.isSticky;
  }

  /**
   * 滚动容器的 scroll 事件处理器：**只在滚回底部附近时恢复 isSticky=true**，绝不设 false。
   * 这样程序滚动后异步派发的 scroll 事件（即便因内容增长读到距底 > 阈值）也不会误暂停跟随。
   */
  onScroll(el: HTMLElement): void {
    if (this.isNearBottom(el)) this.isSticky = true;
  }

  /** 用户主动向上滚动（滚轮/触摸）→ 立即暂停跟随。 */
  onUserScrollUp(): void {
    this.isSticky = false;
  }

  /**
   * 有新内容到达时调用：仅当贴底时即时滚到底（避免 smooth 在高频 token 下叠加卡顿）。
   * 不贴底则什么都不做（即「暂停跟随」）。
   */
  stick(el: HTMLElement): void {
    if (!this.isSticky) return;
    el.scrollTop = el.scrollHeight;
  }

  /**
   * 强制滚到底（发送/切换会话/打开面板/按钮点击）。
   * @param smooth 是否平滑滚动（仅按钮点击建议 true，其余即时）。
   */
  jumpToBottom(el: HTMLElement, smooth = false): void {
    this.isSticky = true;
    if (smooth) {
      try {
        el.scrollTo({ top: el.scrollHeight, behavior: 'smooth' });
      } catch {
        // 极少数环境不支持 scrollTo options，回退即时
        el.scrollTop = el.scrollHeight;
      }
    } else {
      el.scrollTop = el.scrollHeight;
    }
  }

  /** 预留：当前无定时器/动画资源需要清理。 */
  dispose(): void {}

  /** 距底距离是否在阈值内。 */
  private isNearBottom(el: HTMLElement): boolean {
    return el.scrollHeight - el.scrollTop - el.clientHeight <= this.threshold;
  }
}
