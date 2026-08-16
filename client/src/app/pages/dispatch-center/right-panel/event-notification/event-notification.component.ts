import { DatePipe } from '@angular/common';
import {
  Component,
  computed,
  effect,
  ElementRef,
  input,
  output,
  signal,
  ViewChild,
} from '@angular/core';
import Color from 'color';
import dayjs from 'dayjs';
import { AutoScrollComponent } from '../../../../shared/auto.scroll';
import {
  getLineMark,
  lineColorMap2026,
} from '../../../case-detail/services/meta';
const getLineShortName = (line: string) => {
  if (line.match(/\d+/)) {
    return line.replace('号线', '');
  }
  return line;
};

const getLineMainColor = (line: string) => {
  if (line === '4号线') {
    return '#672bc2';
  }
  return lineColorMap2026.get(line) || '#AED3B5';
};
const getLineTagBackgroundColor = (line: string) => {
  const main = getLineMainColor(line);
  return Color(main).alpha(0.4).darken(0.4);
};

/** 实时事件通告滚动倍速档位（0=静止，1=默认） */
const SPEED_LEVELS = [0, 1, 2, 3, 4] as const;
/** 1× 对应的像素/帧速度（与原实现保持一致） */
const BASE_SPEED = 0.08;

@Component({
  selector: 'event-notification-module',
  imports: [DatePipe],
  templateUrl: './event-notification.component.html',
  styleUrl: './event-notification.component.less',
})
export class EventNotificationComponent extends AutoScrollComponent {
  @ViewChild('tbodyRef')
  override scrollContainer!: ElementRef<HTMLTableElement>;
  /** 默认 1×，下标 1 */
  speedIndex = signal<number>(1);
  /** 档位下标上限（用于模板 disabled 判定） */
  maxSpeedIndex = SPEED_LEVELS.length - 1;
  /** 模板用：当前倍速文本，如 "1×" / "1.5×" */
  currentSpeedLabel = computed(() => `${SPEED_LEVELS[this.speedIndex()]}×`);

  constructor() {
    super();

    // 同步档位到父类 speed 字段（父类 RAF 循环直接读取 this.speed）
    effect(() => {
      this.speed = BASE_SPEED * SPEED_LEVELS[this.speedIndex()];
    });

    effect(() => {
      this.notifications();
      this.setScrollHeight();
      this.fixHeight = 576;
      this.autoScroll();
      this.autoScrollEnabled = true;

      setTimeout(() => this.setPaddingRows(), 0);
    });
  }

  events = input<ExtremeOcc.Event[]>([]);
  locateEvent = output<ExtremeOcc.Event>();

  notifications = computed(() => {
    const evs = this.events()
      .filter((ev) => !!ev.isShow)
      .sort((a, b) => dayjs(b.createTime).diff(dayjs(a.createTime)));
    const now = dayjs();
    return evs.map((ev) => ({
      ...ev,
      content: ev.description,
      isNew: now.diff(ev.createTime, 'minute') < 10,
      isFinished: this.isEventFinished(ev),
    }));
  });
  paddingRows = signal<{ content: string }[]>([]);

  /**
   * 判断事件是否已结束：
   * - 事件整体终止（terminated === 1）
   * - 或处于抢修中且抢修状态为"已结束"（urgentRepairStatus === 2）
   */
  isEventFinished(ev: ExtremeOcc.Event): boolean {
    return (
      !!ev.terminated || !!(ev.urgentRepair && ev.urgentRepairStatus === 2)
    );
  }

  setPaddingRows() {
    const nowHeight = this.getDataRowsHeight();
    const rowHeight = 47;
    const supplement = Math.floor((this.fixHeight - nowHeight) / rowHeight);
    if (supplement <= 0) {
      this.paddingRows.set([]);
      return;
    }
    this.paddingRows.set(
      Array.from({ length: supplement }, () => ({
        content: '',
        isNew: false,
      })),
    );
  }

  getDataRowsHeight() {
    const rows =
      this.scrollContainer.nativeElement.querySelectorAll('.has-data');
    return Array.from(rows).reduce((acc, cur) => acc + cur.clientHeight + 5, 0);
  }

  getLineShortName = (line: string) => getLineShortName(line);
  getLineMainColor = (line: string) => getLineMainColor(line);
  getLineTagBackgroundColor = (line: string) => getLineTagBackgroundColor(line);

  handleEventClick(ev: ExtremeOcc.Event) {
    this.locateEvent.emit(ev);
  }

  getLineMark(line: string) {
    return getLineMark(line);
  }

  /** 切换到上一档；到头后保持 */
  decreaseSpeed() {
    const i = this.speedIndex();
    if (i <= 0) return;
    this.speedIndex.set(i - 1);
  }

  /** 切换到下一档；到尾后保持 */
  increaseSpeed() {
    const i = this.speedIndex();
    if (i >= SPEED_LEVELS.length - 1) return;
    this.speedIndex.set(i + 1);
  }
}
