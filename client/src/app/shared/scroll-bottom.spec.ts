import { StickToBottom } from './scroll-bottom';

/** 构造一个可控的「滚动容器」替身：手动设置三轴尺寸即可驱动 StickToBottom 的判定。 */
function makeEl(opts: {
  scrollTop?: number;
  scrollHeight?: number;
  clientHeight?: number;
}) {
  const el = {
    scrollTop: opts.scrollTop ?? 0,
    scrollHeight: opts.scrollHeight ?? 1000,
    clientHeight: opts.clientHeight ?? 600,
    scrollTo: jasmine.createSpy('scrollTo'),
  };
  // 显式声明三轴可写（HTMLElement 上为 readonly），否则测试中模拟内容增长会编译失败。
  return el as unknown as HTMLElement & {
    scrollTo: jasmine.Spy;
    scrollTop: number;
    scrollHeight: number;
    clientHeight: number;
  };
}

describe('StickToBottom', () => {
  it('初始状态贴底（isSticky=true / paused=false）', () => {
    const s = new StickToBottom();
    expect(s.isSticky).toBeTrue();
    expect(s.paused).toBeFalse();
  });

  it('stick：贴底时即时滚到底', () => {
    const s = new StickToBottom();
    const el = makeEl({
      scrollTop: 380,
      scrollHeight: 1000,
      clientHeight: 600,
    }); // 距底 20px
    s.stick(el);
    expect(el.scrollTop).toBe(1000);
  });

  it('onScroll 只恢复不暂停：距底 > 阈值时 isSticky 保持 true', () => {
    const s = new StickToBottom();
    const el = makeEl({ scrollTop: 0, scrollHeight: 1000, clientHeight: 600 }); // 距底 400px
    s.onScroll(el);
    // 即使距底很远，onScroll 也不会把 isSticky 设为 false
    expect(s.isSticky).toBeTrue();
  });

  it('onScroll 只恢复不暂停：距底 ≤ 阈值时恢复 isSticky=true', () => {
    const s = new StickToBottom();
    const el = makeEl({ scrollTop: 0, scrollHeight: 1000, clientHeight: 600 });
    s.onUserScrollUp();
    expect(s.isSticky).toBeFalse();

    el.scrollTop = 350; // 距底 50px（阈值 80 内）
    s.onScroll(el);
    expect(s.isSticky).toBeTrue();
    expect(s.paused).toBeFalse();
  });

  it('onUserScrollUp：暂停跟随，随后 stick 不再滚动', () => {
    const s = new StickToBottom();
    const el = makeEl({ scrollTop: 0, scrollHeight: 1000, clientHeight: 600 });
    s.onUserScrollUp();
    expect(s.isSticky).toBeFalse();
    expect(s.paused).toBeTrue();

    el.scrollHeight = 1200; // 新内容增长，底部更远
    s.stick(el);
    expect(el.scrollTop).toBe(0); // 未被滚动
  });

  it('暂停后 onScroll（贴底）恢复 isSticky=true', () => {
    const s = new StickToBottom();
    const el = makeEl({ scrollTop: 0, scrollHeight: 1000, clientHeight: 600 });
    s.onUserScrollUp();
    expect(s.isSticky).toBeFalse();

    el.scrollTop = 380; // 距底 20px
    s.onScroll(el);
    expect(s.isSticky).toBeTrue();

    // 恢复后 stick 能跟随
    el.scrollHeight = 1300;
    s.stick(el);
    expect(el.scrollTop).toBe(1300);
  });

  it('jumpToBottom：无视当前状态强制滚到底并恢复 sticky（即时）', () => {
    const s = new StickToBottom();
    const el = makeEl({ scrollTop: 0, scrollHeight: 1000, clientHeight: 600 });
    s.onUserScrollUp(); // 进入暂停
    expect(s.isSticky).toBeFalse();

    s.jumpToBottom(el);
    expect(el.scrollTop).toBe(1000);
    expect(s.isSticky).toBeTrue();
  });

  it('jumpToBottom(smooth)：用 scrollTo 平滑滚动并恢复 sticky', () => {
    const s = new StickToBottom();
    const el = makeEl({ scrollTop: 0, scrollHeight: 1000, clientHeight: 600 });
    s.onUserScrollUp(); // 进入暂停

    s.jumpToBottom(el, true);
    expect(el.scrollTo).toHaveBeenCalledWith({ top: 1000, behavior: 'smooth' });
    expect(s.isSticky).toBeTrue();
  });

  it('阈值边界：距底恰等于阈值视为贴底', () => {
    const s = new StickToBottom(80);
    const el = makeEl({
      scrollTop: 320,
      scrollHeight: 1000,
      clientHeight: 600,
    }); // 1000-320-600=80
    // 距底恰为阈值，onScroll 应判定贴底
    s.onUserScrollUp();
    expect(s.isSticky).toBeFalse();
    s.onScroll(el);
    expect(s.isSticky).toBeTrue();
  });

  it('回归：流式场景下连续 stick（内容持续增长）+ 穿插 onScroll，isSticky 始终保持 true、stick 每轮都跟随', () => {
    // 本条锁住「流式时不滚动」bug：程序滚动冒泡的异步 scroll 事件读到增长后的 scrollHeight
    // （距底 > 阈值）时，onScroll 不应误把 isSticky 设 false。
    const s = new StickToBottom();
    let scrollHeight = 1000;
    const el = makeEl({
      scrollTop: 400, // 贴底
      scrollHeight,
      clientHeight: 600,
    });

    for (let i = 0; i < 5; i++) {
      // 1) 新内容到达 → 程序滚到底
      scrollHeight += 100; // 模拟 token 让内容增长
      el.scrollHeight = scrollHeight;
      s.stick(el);
      expect(el.scrollTop).toBe(scrollHeight); // 每轮都滚到最新底部
      expect(s.isSticky).toBeTrue();

      // 2) 程序滚动冒泡的异步 scroll 事件：此时 scrollTop 仍是上一帧的旧值，
      //    算出距底 > 阈值——onScroll 不应据此暂停
      s.onScroll(el);
      expect(s.isSticky).toBeTrue();
    }
  });
});
