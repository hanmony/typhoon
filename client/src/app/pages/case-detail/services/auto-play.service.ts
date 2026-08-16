import { Injectable } from '@angular/core';
import { Subject } from 'rxjs';
import { ActionCategory } from '../../../domain/action.category';
import { ActionDto } from '../../../domain/action.dto';
import { CaseDetailComponent } from '../case-detail.component';
import { AutoPlayKeynoteTask } from './classes/autoplay.keynote.task.class';
import { AutoPlayQueue } from './classes/autoplay.queue.class';
import { AutoPlayTask } from './classes/autoplay.task.class';
import { KeyEventReactService } from './key-event-react.service';
import { LocalEventReactService } from './local-event-react.service';
import { MapService } from './map.service';
import { MediaPlayService } from './media.play.service';
import { MetroService } from './metro.service';
import { UtilsService } from './utils.service';

interface InitOptions {
  caseDetailRef: CaseDetailComponent;
}

export interface INoticeNode {
  type: 'single' | 'compose';
  data: ActionDto[];
}

export enum AutoPlayState {
  INITIALIZED = 'INITIALIZED',
  RUNNING = 'RUNNING',
  PAUSED = 'PAUSED',
  FINISHED = 'FINISHED',
  TERMINATED = 'TERMINATED',
}

/**
1，行车措施—提前巡道
2，施工调整—取消施工、调整时间、新增施工
3，客运措施—关闭车站
 */
const shouldMergeSubTypes = [
  '提前巡道',
  '取消施工',
  '调整时间',
  '新增施工',
  '关闭车站',
];

export const NOTIFICATION_BASE_DURATION = 4000;

@Injectable({
  providedIn: 'root',
})
export class AutoPlayService {
  state: AutoPlayState = AutoPlayState.TERMINATED;
  progress: number = 0; // 0 - 100
  autoPlayStateChangeSubject$ = new Subject<AutoPlayState>();
  autoPlayTaskChangeSubject$ = new Subject<AutoPlayTask | null>();
  autoPlayProgressChangeSubject$ = new Subject<number>();
  autoPlayRateChangeSubject$ = new Subject<number>();
  caseDetailRef?: CaseDetailComponent;
  queue?: AutoPlayQueue;
  _noticeStack: INoticeNode[] = [];
  noticeTimer?: NodeJS.Timeout;
  rate = 1;
  constructor(
    readonly utils: UtilsService,
    readonly localEventReactService: LocalEventReactService,
    readonly keyEventReactService: KeyEventReactService,
    readonly mediaPlayService: MediaPlayService,
    readonly metroService: MetroService,
    readonly mapService: MapService,
  ) {}
  init(options: InitOptions) {
    this.caseDetailRef = options.caseDetailRef;
    this.state = AutoPlayState.INITIALIZED;
    this.progress = 0;
    this.autoPlayStateChangeSubject$.next(this.state);
    this.autoPlayProgressChangeSubject$.next(this.progress);
  }
  play(time?: string, endTime?: string) {
    this.caseDetailRef?.prepareAutoPlaying();
    this.metroService.setRunningColor();
    this.generateQueue();
    this.state = AutoPlayState.INITIALIZED;
    this.progress = 0;
    this.autoPlayStateChangeSubject$.next(this.state);
    this.autoPlayProgressChangeSubject$.next(this.progress);

    this.mapService.setStartAutoView();
    this.mapService.disableMoveAndZoom();
    this.countdown?.startCountdown(() => {
      this.state = AutoPlayState.RUNNING;
      this.autoPlayStateChangeSubject$.next(this.state);
      this.queue?.run(time, endTime);
    });
  }
  pause() {
    this.queue?.pause();
    this.pauseNotice();
    this.state = AutoPlayState.PAUSED;
    this.autoPlayStateChangeSubject$.next(this.state);
    this.mapService.enableMoveAndZoom();
  }
  resume() {
    this.queue?.resume();
    this.resumeNotice();
    this.state = AutoPlayState.RUNNING;
    this.autoPlayStateChangeSubject$.next(this.state);
    if (this.queue?.currentTask instanceof AutoPlayKeynoteTask) {
      this.queue?.currentTask.locate();
    } else {
      this.mapService.setStartAutoView();
    }
    this.mapService.disableMoveAndZoom();
  }
  finish() {
    this.state = AutoPlayState.FINISHED;
    // this.clearMap();
    this.mapService.enableMoveAndZoom();
    this.autoPlayStateChangeSubject$.next(this.state);
    this.autoPlayTaskChangeSubject$.next(null);
    this.message?.info('播放已结束, 请手动退出');
  }
  quit() {
    this.countdown?.terminateCountdown();
    this.queue?.quit();
    this.clearMap();
    this.mapService.enableMoveAndZoom();
    this.state = AutoPlayState.TERMINATED;
    this.progress = 0;
    this.autoPlayProgressChangeSubject$.next(this.progress);
    this.autoPlayStateChangeSubject$.next(this.state);
    this.autoPlayTaskChangeSubject$.next(null);
    this.metroService.revertColor();
  }
  jumpToNextTiming() {
    this.queue?.jumpToNextTiming();
    if (this.state === AutoPlayState.PAUSED) {
      this.queue?.pause();
    }
  }
  jumpToLastTiming() {
    this.queue?.jumpToLastTiming();
    if (this.state === AutoPlayState.PAUSED) {
      this.queue?.pause();
    }
  }
  onRateChange(r: number) {
    this.rate = r;
    this.queue?.onRateChange(r);
    this.autoPlayRateChangeSubject$.next(r);
  }
  generateQueue() {
    const evs = [
      ...(this.caseDetailRef?.filteredRawLocalEvents || []),
      ...this.utils.serializedEventsDto.globalEvents,
    ];
    this.queue = new AutoPlayQueue({
      service: this,
      rowEvents: evs,
      serializedEventsDto: this.utils.serializeEvents(evs),
      timeEventDto: this.utils.separateEventsByTime(evs),
    });
    this.caseDetailRef?.typhoonModel?.setAutoPlayPath(this.queue.tasks);
  }
  autoPlayTaskChange(currentTask: AutoPlayTask) {
    this.setProgress(currentTask);
    this.autoPlayTaskChangeSubject$.next(currentTask);
  }
  setProgress(currentTask: AutoPlayTask) {
    const length = this.queue?._progressTasks.length || 0;
    if (!length) {
      this.progress = 0;
    } else {
      const index = this.queue!._progressTasks.findIndex(
        (task) => task.id === currentTask.id,
      );
      this.progress = ((index + 1) / length) * 100;
    }
    this.autoPlayProgressChangeSubject$.next(this.progress);
  }
  effectMap(
    time: string,
    currentCategory: ActionCategory,
    events: ActionDto[],
  ) {
    const currentEvents = this.utils.filterEventsByTimeSlice(
      time,
      currentCategory,
      events,
    );
    this.caseDetailRef?.autoPlayEffectMap(time, currentEvents);
  }
  clearMap() {
    this.caseDetailRef?.clearAutoPlayMap();
    this.clearNoticeKeyEventEffects();
  }
  noticeKeyEvents(evs: ActionDto[]) {
    const shouldMergeMap = new Map<string, ActionDto[]>();
    let nodes: INoticeNode[] = [];

    const shouldNoticeEvs = evs.filter((ev) => {
      return (
        ev.category !== ActionCategory.keynote &&
        ev.category !== ActionCategory.weather
      );
    });
    for (const ev of shouldNoticeEvs) {
      const subType = this.utils.getSubType(ev);
      const timeString = `${this.utils.formatTimeString(
        ev.fromDate,
      )} - ${this.utils.formatTimeString(ev.toDate)}`;
      const key = `${subType}-${timeString}`;
      if (shouldMergeSubTypes.includes(subType)) {
        const shouldMerge = shouldMergeMap.get(key);
        if (shouldMerge) {
          shouldMerge.push(ev);
        } else {
          const node: INoticeNode = {
            type: 'compose',
            data: [ev],
          };
          shouldMergeMap.set(key, node.data);
          nodes.push(node);
        }
      } else {
        nodes.push({
          type: 'single',
          data: [ev],
        });
      }
    }
    this._noticeStack = [...this._noticeStack, ...nodes];
    if (this.noticeTimer) return;
    this.noticeKeyEventTimeout();
  }
  noticeKeyEventTimeout() {
    const ev = this._noticeStack.shift();
    if (ev) {
      this.noticeKeyEventByTemplate(ev);
    } else {
      clearTimeout(this.noticeTimer);
      this.noticeTimer = undefined;
      return;
    }
    this.noticeTimer = setTimeout(() => {
      this.noticeKeyEventTimeout();
    }, 1000);
  }
  clearNoticeKeyEventEffects() {
    this._noticeStack = [];
    clearTimeout(this.noticeTimer);
    this.noticeTimer = undefined;
  }
  pauseNotice() {
    clearTimeout(this.noticeTimer);
  }
  resumeNotice() {
    this.noticeTimer = setTimeout(() => {
      this.noticeKeyEventTimeout();
    }, 500);
  }
  noticeKeyEventByTemplate(stackNode: INoticeNode) {
    this.notification?.template(this.caseDetailRef!.notificationTemplateRef!, {
      nzPlacement: 'topLeft',
      nzData: stackNode,
      nzStyle: {
        top: '110px',
        background:
          'linear-gradient(225deg, #081835 0%, #081835 15%, #173f6d 85%, #173f6d 100%)',
      },
      nzDuration: NOTIFICATION_BASE_DURATION / this.rate,
    });
  }
  get countdown() {
    return this.caseDetailRef?.autoplayCountdownRef;
  }
  get message() {
    return this.caseDetailRef?.message;
  }
  get notification() {
    return this.caseDetailRef?.notification;
  }
}
