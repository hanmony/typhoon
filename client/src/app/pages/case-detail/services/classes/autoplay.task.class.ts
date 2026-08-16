import { v4 as uuidV4 } from 'uuid';
import { ActionCategory } from '../../../../domain/action.category';
import { ActionDto } from '../../../../domain/action.dto';
import { AutoPlayService, AutoPlayState } from '../auto-play.service';
import { LOCAL_EVENT_KEYS_MAP } from '../utils.service';
import { AutoPlayQueue } from './autoplay.queue.class';
import { Typhoon } from './typhoon.class';

const GLOBAL_EVENT_DURATION = 4000;
const LOCAL_EVENT_DURATION = 10000;
const IN_CITY_BOUNDARY_RATE = 0.25;

export interface AutoPlayTaskConfig {
  service: AutoPlayService;
  startTime: string;
  category: ActionCategory;
  events: ActionDto[];
  belongs: AutoPlayQueue;
}

export class AutoPlayTask {
  id: string;
  belongs: AutoPlayQueue;
  duration: number = 0;
  inBoundary: boolean = false;
  currentTimingInBoundary: boolean = false;
  state: AutoPlayState;
  service: AutoPlayService;
  startTime: string;
  category: ActionCategory;
  events: ActionDto[];

  next?: AutoPlayTask;
  previous?: AutoPlayTask;

  timer?: NodeJS.Timeout;
  timerStart: number = 0;
  timeStop: number = 0;

  constructor(config: AutoPlayTaskConfig) {
    this.id = uuidV4();
    this.belongs = config.belongs;
    this.category = config.category;
    this.state = AutoPlayState.INITIALIZED;
    this.service = config.service;
    this.startTime = config.startTime;
    this.events = config.events;
  }
  isInBoundary(): boolean {
    const frame = this.typhoonModel?.getFrameByTime(new Date(this.startTime));
    if (!this.previousTiming) {
      return false;
    }
    const lastFrame = this.typhoonModel?.getFrameByTime(
      new Date(this.previousTiming.startTime),
    );
    if (!frame || !lastFrame) return false;
    const { center } = frame;
    const { center: lastCenter } = lastFrame;
    const cross = this.mapService.booleanCrosses(center, lastCenter);
    return cross;
  }
  setDuration() {
    const baseDuration = LOCAL_EVENT_KEYS_MAP.find(
      ([_key, cate]) => cate === this.category,
    )
      ? LOCAL_EVENT_DURATION
      : GLOBAL_EVENT_DURATION;
    this.duration = baseDuration / this.getRate();
  }
  setCurrentTimingInBoundary() {
    this.inBoundary = this.isInBoundary();
    this.currentTimingInBoundary = this.inBoundary;
    return this.inBoundary;
  }
  /**
   * Calculates the rate based on the current timing in boundary and adjacent tasks in boundary count.
   *
   * @return {number} The calculated rate.
   *
   * 获取速率的方法稍稍复杂，加点注释：
   * 1. 如果当前事件不在上海边界，返回基础速率(1)
   * 2. 如果当前事件在上海边界，判断在边界内的总的事件数
   * 3. 判断： 边界内速率(IN_CITY_BOUNDARY_RATE) * 边界内的总的事件数
   *   3.1 该值超过 1，返回基础速率(1)
   *   3.2 该值不超过 1，返回该值
   */
  getRate() {
    if (!this.currentTimingInBoundary) {
      return this.service.rate;
    }
    return (
      Math.min(this.adjacentTasksInBoundaryCount * IN_CITY_BOUNDARY_RATE, 1) *
      this.service.rate
    );
  }
  run(): void {
    this.service.noticeKeyEvents(
      this.events.filter((ev) => !this.utils.shouldOmitNotice(ev)),
    );

    if (this.typhoonModel) {
      this.typhoonModel?.animateByTask({
        taskId: this.id,
        duration: this.duration,
        onDone: this.finish.bind(this),
        onTickDone: this.onTickDone.bind(this),
      });
    } else {
      this.timerStart = new Date().getTime();
      this.timer = setTimeout(this.finish.bind(this), this.duration);
    }
    this.effectPanel();
    this.effectModal();
    // this.effectKeyEvent();
    this.belongs.effectMap();
  }
  onTickDone(typhoon: Typhoon) {
    const coord = typhoon.getCoord();
    const boolean = this.mapService.isInBoundary([coord.lat, coord.lng]);
    this.mapService.setViewRangeForbidden(boolean);
    if (boolean) {
      this.mapService.setCityView();
    } else {
      this.mapService.setStartAutoView();
    }
  }
  effectPanel() {
    if (!LOCAL_EVENT_KEYS_MAP.find(([_key, cate]) => cate === this.category)) {
      this.events.forEach((ev) => this.panelRef?.autoPlayPushEvent(ev));
    }
  }
  effectModal() {
    if (LOCAL_EVENT_KEYS_MAP.find(([_key, cate]) => cate === this.category)) {
      this.modalRef?.open(this.category, this.events);
    }
  }
  effectKeyEvent() {
    this.service.keyEventReactService.react(this.events);
  }
  clearKeyEventReaction() {
    this.service.keyEventReactService.clearReaction();
  }
  closeModel() {
    if (LOCAL_EVENT_KEYS_MAP.find(([_key, cate]) => cate === this.category)) {
      this.modalRef?.close();
    }
  }
  pause(): void {
    if (this.typhoonModel) {
      this.typhoonModel.pauseAutoPlay();
    } else {
      clearTimeout(this.timer);
    }
  }
  resume(): void {
    if (this.typhoonModel) {
      this.typhoonModel.resumeAutoPlay();
    } else {
      this.timer = setTimeout(this.finish.bind(this), this.duration);
    }
  }
  finish(): void {
    this.closeModel();
    this.clearKeyEventReaction();
    this.state = AutoPlayState.FINISHED;
    this.belongs.processNextTask();
  }
  quit(): void {
    this.closeModel();
    this.clearKeyEventReaction();
    this.closeNotification();
    this.state = AutoPlayState.TERMINATED;
    this.typhoonModel?.quitAutoPlay();
  }
  locateTyphoonImmediately() {
    this.typhoonModel?.autoPlayLocateByTime(this.id);
  }
  onRateChange(r: number) {
    this.setDuration();
    if (this.typhoonModel) {
      if (this.service.state === AutoPlayState.RUNNING) {
        if (this.belongs.currentTask === this) {
          this.typhoonModel?.resetDuration(this.duration);
        }
      }
    } else {
      clearTimeout(this.timer);
      this.timer = setTimeout(this.finish.bind(this), this.duration);
    }
  }
  get notification() {
    return this.service.caseDetailRef!.notification;
  }
  closeNotification() {
    this.notification.remove();
  }
  get nextTiming() {
    let next = this.next;
    while (next) {
      if (next.startTime !== this.startTime) {
        break;
      }
      next = next.next;
    }
    return next;
  }
  get previousTiming() {
    let previous = this.previous;
    while (previous) {
      if (previous.startTime !== this.startTime) {
        break;
      }
      previous = previous.previous;
    }
    return previous;
  }
  get hasPreviousTiming() {
    return !!this.previousTiming;
  }
  get hasNextTiming() {
    return !!this.nextTiming;
  }
  get utils() {
    return this.service.utils;
  }
  get typhoonModel() {
    return this.service.caseDetailRef?.typhoonModel;
  }
  get panelRef() {
    return this.service.caseDetailRef?.panelRef;
  }
  get modalRef() {
    return this.service.caseDetailRef?.autoplayEventPandectModalRef;
  }
  get previousTasksSameTimeCount() {
    let length = 0;
    let previous = this.previous;
    while (previous) {
      if (previous.startTime !== this.startTime) {
        break;
      } else {
        length++;
        previous = previous.previous;
      }
    }
    return length;
  }
  get nextTasksSameTimeCount() {
    let length = 0;
    let next = this.next;
    while (next) {
      if (next.startTime !== this.startTime) {
        break;
      } else {
        length++;
        next = next.next;
      }
    }
    return length;
  }
  get sameTimeDto() {
    return {
      total: this.previousTasksSameTimeCount + 1 + this.nextTasksSameTimeCount,
      index: this.previousTasksSameTimeCount,
    };
  }
  get previousTasksInBoundaryCount() {
    let length = 0;
    let previous = this.previous;
    while (previous) {
      if (previous.currentTimingInBoundary) {
        length++;
      }
      previous = previous.previous;
    }
    return length;
  }
  get nextTasksInBoundaryCount() {
    let length = 0;
    let next = this.next;
    while (next) {
      if (next.currentTimingInBoundary) {
        length++;
      }
      next = next.previous;
    }
    return length;
  }
  get adjacentTasksInBoundaryCount(): number {
    return this.previousTasksInBoundaryCount + this.nextTasksInBoundaryCount;
  }
  get mapService() {
    return this.service.mapService;
  }
}
