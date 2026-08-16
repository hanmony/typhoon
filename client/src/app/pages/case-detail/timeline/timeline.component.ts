import {
  Component,
  ElementRef,
  EventEmitter,
  Input,
  Output,
  ViewChild,
} from '@angular/core';
import { ActionDto } from '../../../domain/action.dto';
import { LibraryNzModule } from '../../../library.nz.module';
import { AutoPlayTask } from '../services/classes/autoplay.task.class';
import { MapService } from '../services/map.service';
import {
  LOCAL_EVENT_KEYS_MAP,
  SerializedEventsDto,
  UtilsService,
} from '../services/utils.service';
import {
  AutoPlayService,
  AutoPlayState,
} from './../services/auto-play.service';
import { AlertPointComponent } from './alert-point/alert-point.component';
import { ControlButtonsComponent } from './control-buttons/control-buttons.component';
import { EndpointComponent } from './endpoint/endpoint.component';
import { NormalPointComponent } from './normal-point/normal-point.component';
import { PartialComponent } from './partial/partial.component';
import { PeriodComponent } from './period/period.component';
import { WindCircleComponent } from './wind-circle/wind-circle.component';

export interface Timing {
  startTime: string;
  isKey: boolean;
  events: ActionDto[];
}

export interface Point {
  type: string;
  rawEvent: ActionDto;
  timing: Timing;
}

export interface Period {
  data: SerializedEventsDto;
  pureEvents: ActionDto[]; // 不包含 警报
  startEvent?: ActionDto;
  endEvent?: ActionDto;
  timings: Timing[];
}

@Component({
  selector: 'case-detail-timeline',
  imports: [
    EndpointComponent,
    AlertPointComponent,
    WindCircleComponent,
    PeriodComponent,
    NormalPointComponent,
    ControlButtonsComponent,
    PartialComponent,
    LibraryNzModule,
  ],
  templateUrl: './timeline.component.html',
  styleUrls: [
    './timeline.component.less',
    './control-buttons/control-buttons.component.less',
  ],
})
export class TimelineComponent {
  autoPlaying = false;
  autoPlayState = AutoPlayState.INITIALIZED;
  autoPlayTime: string = '';
  mode: 'entire' | 'partial' = 'entire';
  duration: number = 0;
  timelineProgress = 0;
  processTransitionFlag = true;
  sliceMode: boolean = false;
  weatherPoints: Point[] = [];
  periods: Period[] = [];
  allTimings: Timing[] = [];
  selectPeriodIndex = 0;
  openingPeriod?: Period;
  viewingRange = 0;
  previousDisabled: boolean = true;
  nextDisabled: boolean = true;
  autoPlayDisabled: boolean = false;
  processDisabled: boolean = false;
  sliceTimeStrings: string[] = [];

  availableWidth = 1336;

  @Input() events: ActionDto[] = [];
  @Input() windCircleVisible = false;
  @Input() selectedTiming?: Timing;
  @Output() onSelect = new EventEmitter<Timing>();
  @Output() onWindCircleChange = new EventEmitter<boolean>();

  @ViewChild(PartialComponent) partialRef!: PartialComponent;
  @ViewChild('availableSpaceRef')
  availableSpaceRef!: ElementRef<HTMLDivElement>;
  constructor(
    private readonly utils: UtilsService,
    private readonly autoPlayService: AutoPlayService,
    private readonly mapService: MapService,
  ) {}
  ngAfterViewInit() {
    // this.autoPlaying = this.autoPlayService
    this.autoPlayService.autoPlayStateChangeSubject$.subscribe((state) => {
      this.autoPlayState = state;
      if (state === AutoPlayState.RUNNING) {
        this.autoPlaying = true;
        this.processDisabled = false;
      } else if (state === AutoPlayState.TERMINATED) {
        this.autoPlaying = false;
        this.mode = 'entire';
        this.previousDisabled = true;
        this.nextDisabled = true;
      } else if (state === AutoPlayState.FINISHED) {
        this.processDisabled = true;
        this.previousDisabled = true;
        this.nextDisabled = true;
      }
    });
    this.autoPlayService.autoPlayTaskChangeSubject$.subscribe((task) => {
      if (task) {
        this.autoPlayTime = task.startTime;
        this.duration = task.duration;
        this.trackAutoPlayingTask(task);
        this.previousDisabled = !task.hasPreviousTiming;
        this.nextDisabled = !task.hasNextTiming;
      }
    });
    this.autoPlayService.autoPlayProgressChangeSubject$.subscribe((p) => {
      this.timelineProgress = Number(p) || 0;
    });
    this.setAvailableWidth();
  }
  setAvailableWidth() {
    const dom = this.availableSpaceRef.nativeElement;
    if (!dom) return;
    const { width } = dom.getBoundingClientRect();
    setTimeout(() => {
      this.availableWidth = width - 39 * 2 - 4 * 8;
    });
  }
  onViewingRangeChange(r: number) {
    this.viewingRange = r;
    this.mapService.setViewingRange(r);
  }
  onRateChange(r: number) {
    this.autoPlayService.onRateChange(r);
  }
  toggleWindCircle() {
    this.onWindCircleChange.emit(!this.windCircleVisible);
  }
  onSliceModeChange() {
    this.sliceMode = !this.sliceMode;
    this.mode = 'entire';
    if (this.sliceMode) {
      if (this.selectedTiming) {
        this.previousDisabled = true;
        this.nextDisabled = true;
        this.onSelect.emit();
      }
      this.autoPlayDisabled = true;
    } else {
      this.autoPlayDisabled = false;
      this.sliceTimeStrings = [];
    }
  }
  init() {
    // this.mode = 'entire';
    this.weatherPoints = this.getWeatherEvents();
    this.periods = this.getPeriods();
    this.allTimings = this.getAllTimings();
    this.onCollapse();
    this.resetTiming();
    setTimeout(() => {
      this.setAvailableWidth();
    }, 100);
  }
  resetTiming() {
    if (this.selectedTiming) {
      const startTime = this.selectedTiming.startTime;
      const selectedPoint = this.weatherPoints.find(
        (e) => e.timing.startTime === startTime,
      );
      if (selectedPoint) {
        return this.onSelect.emit(selectedPoint.timing);
      }
      for (const p of this.periods) {
        const cur = p.timings.find((t) => t.startTime === startTime);
        if (cur) {
          return this.onSelect.emit(cur);
        }
      }
      this.onCollapse();
      this.onSelect.emit();
    } else {
      this.onCollapse();
    }
  }
  normalPointShouldBorder(timing: Timing): boolean {
    if (
      timing.events.some((e) =>
        LOCAL_EVENT_KEYS_MAP.map((k) => k[1]).includes(e.category),
      )
    ) {
      return true;
    }
    return false;
  }
  getWeatherEvents() {
    return this.utils.weatherEvents.map((e) => {
      const startTime = this.getTimeString(e.fromDate);
      return {
        type: this.utils.getWeatherAlertTypeNew(e),
        rawEvent: e,
        timing: {
          startTime,
          isKey: this.utils.isKeyEvent(e),
          events: this.utils.getEventsByTime(startTime, this.events),
        },
      };
    });
  }
  getPeriods(): Period[] {
    const result = [this.getEvents(-1, 0)] as Period[];
    this.weatherPoints.forEach((e, i) => {
      result.push(this.getEvents(i, i + 1));
    });
    return result;
  }
  getTimeString(d: Date) {
    return this.utils.formatTimeString(d);
  }
  getAllTimings(): Timing[] {
    return this.getTimings(this.events)
      .slice()
      .sort((a, b) => {
        return (
          new Date(a.startTime).getTime() - new Date(b.startTime).getTime()
        );
      });
  }
  getTimings(evs: ActionDto[]): Timing[] {
    const timeMap = new Map<string, ActionDto[]>();
    evs.forEach((ev, i) => {
      const timeString = this.getTimeString(ev.fromDate);
      if (!timeMap.get(timeString)) {
        timeMap.set(timeString, [ev]);
      } else {
        timeMap.get(timeString)!.push(ev);
      }
    });
    return Array.from(timeMap).map(([k, evs]) => {
      return {
        startTime: k,
        isKey: evs.some((v) => this.utils.isKeyEvent(v)),
        events: evs,
      };
    });
  }
  getEvents(startIndex: number, endIndex: number) {
    const startEvent = this.weatherPoints[startIndex]?.rawEvent;
    const endEvent = this.weatherPoints[endIndex]?.rawEvent;

    const evs = this.utils.getEventsByPeriod(
      this.utils.formatTimeString(startEvent?.fromDate) || '1977-01-01 00:00',
      this.utils.formatTimeString(endEvent?.fromDate) || '2099-12-31 00:00',
      this.events,
    );
    return {
      data: this.utils.serializeEvents(evs),
      // pureEvents: evs.filter((e) => e.category !== '预警发布及响应'),
      pureEvents: evs,
      startEvent,
      endEvent,
      timings: this.getTimings(evs),
    };
  }
  onPeriodExpand(p: Period) {
    if (this.autoPlaying) return;
    if (p.timings.length >= 3) {
      this.mode = 'partial';
      this.openingPeriod = p;
      this.selectPeriodIndex = this.periods.indexOf(p);
    }
  }
  onPointClick(cp: Point) {
    if (this.autoPlaying) return;
    if (!this.sliceMode) {
      this.onSelect.emit(cp.timing);
      setTimeout(() => {
        this.previousDisabled = !this.previousTiming;
        this.nextDisabled = !this.nextTiming;
      });
    } else {
      this.setSlicePoints(cp.timing.startTime);
    }
  }
  onEndpointClick(e: Event, t: string) {
    e.stopPropagation();
    if (!this.sliceMode) return;
    this.setSlicePoints(t);
  }
  setSlicePoints(timeString: string) {
    const len = this.sliceTimeStrings.length;
    if (len === 1) {
      if (this.sliceTimeStrings[0] === timeString) {
        this.autoPlayDisabled = true;
        this.sliceTimeStrings = [];
        return;
      }
      this.sliceTimeStrings = [this.sliceTimeStrings[0], timeString].sort(
        (a, b) => {
          const aTime = this.getTimeString(new Date(a));
          const bTime = this.getTimeString(new Date(b));
          if (aTime > bTime) {
            return 1;
          }
          if (aTime < bTime) {
            return -1;
          }
          return 0;
        },
      );
      this.autoPlayDisabled = false;
    } else {
      this.autoPlayDisabled = true;
      this.sliceTimeStrings = [timeString];
    }
  }

  onTimingSelect(t: Timing) {
    if (this.autoPlaying) return;
    this.onSelect.emit(t);
    setTimeout(() => {
      this.previousDisabled = !this.previousTiming;
      this.nextDisabled = !this.nextTiming;
    });
  }
  onCollapse() {
    if (this.mode === 'partial' && !this.autoPlaying) {
      this.mode = 'entire';
    }
  }
  findTiming(timeString: string): Timing | null {
    let target: Timing | null = null;
    for (const p of this.periods) {
      const cur = p.timings.find((t) => t.startTime === timeString);
      if (cur) {
        target = cur;
      }
    }
    return target;
  }
  autoPlayHandler() {
    if (this.sliceMode) {
      this.autoPlayService.play(
        this.sliceTimeStrings[0],
        this.sliceTimeStrings[1],
      );
    } else {
      this.autoPlayService.play(this.selectedTiming?.startTime);
    }
  }
  previousHandler() {
    if (!this.autoPlaying) {
      this.selectPreviousTiming();
    } else {
      this.autoPlayService.clearNoticeKeyEventEffects();
      this.autoPlayService.jumpToLastTiming();
    }
    this.toggleProcessTransitionFlag();
  }
  nextHandler() {
    if (!this.autoPlaying) {
      this.selectNextTiming();
    } else {
      this.autoPlayService.clearNoticeKeyEventEffects();
      this.autoPlayService.jumpToNextTiming();
    }
    this.toggleProcessTransitionFlag();
  }
  toggleProcessTransitionFlag() {
    this.processTransitionFlag = false;
    setTimeout(() => {
      this.processTransitionFlag = true;
    }, 100);
  }
  selectPreviousTiming() {
    if (!this.previousDisabled) {
      this.onTimingSelect(this.previousTiming!);
      setTimeout(this.trackTiming.bind(this));
    }
  }
  selectNextTiming() {
    if (!this.nextDisabled) {
      this.onTimingSelect(this.nextTiming!);
      setTimeout(this.trackTiming.bind(this));
    }
  }
  trackByTime(time: string) {
    if (!this.weatherPoints.length) {
      this.mode = 'entire';
      return;
    }
    const itsAlert = this.weatherPoints.find(
      (e) => e.timing.startTime === time,
    );
    if (itsAlert && this.mode === 'partial') {
      this.mode = 'entire';
      return;
    }
    let period: Period | null = null;
    let t: Timing | null = null;
    for (const p of this.periods) {
      const cur = p.timings.find((t) => t.startTime === time);
      if (cur) {
        period = p;
        t = cur;
        break;
      }
    }
    if (period) {
      if (period.timings.length > 3) {
        this.mode = 'partial';
        this.openingPeriod = period;
        this.selectPeriodIndex = this.periods.indexOf(period);
        if (t) {
          this.partialRef?.trackInView(t);
        }
      } else {
        this.mode = 'entire';
      }
    }
  }
  trackAutoPlayingTask(task: AutoPlayTask) {
    const time = task.startTime;
    this.trackByTime(time);
  }
  trackTiming() {
    const time = this.selectedTiming?.startTime;
    if (!time) return;
    this.trackByTime(time);
  }
  get previousTiming() {
    if (!this.selectedTiming) return;
    const alertIndex = this.weatherPoints.findIndex(
      (e) => e.timing.startTime === this.selectedTiming!.startTime,
    );
    if (alertIndex > -1) {
      const lastPeriodTimings = this.periods[alertIndex]?.timings;
      if (!lastPeriodTimings || lastPeriodTimings.length === 0) {
        return this.weatherPoints[alertIndex - 1]?.timing;
      }
      return lastPeriodTimings[lastPeriodTimings.length - 1];
    }
    let periodIndex = -1;
    let pointIndex = -1;
    for (let i = 0; i < this.periods.length; i++) {
      const p = this.periods[i];
      const index = p.timings.findIndex(
        (e) => e.startTime === this.selectedTiming!.startTime,
      );
      if (index > -1) {
        periodIndex = i;
        pointIndex = index;
        break;
      }
    }
    if (periodIndex > 0) {
      const targetPeriod = this.periods[periodIndex];
      if (targetPeriod.timings[pointIndex - 1]) {
        return targetPeriod.timings[pointIndex - 1];
      } else {
        if (periodIndex !== 0) {
          return this.weatherPoints[periodIndex - 1]?.timing;
        }
      }
    }
    return;
  }
  get nextTiming() {
    if (!this.selectedTiming) return;
    const alertIndex = this.weatherPoints.findIndex(
      (e) => e.timing.startTime === this.selectedTiming!.startTime,
    );
    if (alertIndex > -1) {
      const nextPeriodTimings = this.periods[alertIndex + 1]?.timings;
      if (!nextPeriodTimings || !nextPeriodTimings.length) {
        return this.weatherPoints[alertIndex + 1]?.timing;
      }
      if (nextPeriodTimings.length) {
        return nextPeriodTimings[0];
      }
    }
    let periodIndex = -1;
    let pointIndex = -1;
    for (let i = 0; i < this.periods.length; i++) {
      const p = this.periods[i];
      const index = p.timings.findIndex(
        (e) => e.startTime === this.selectedTiming!.startTime,
      );
      if (index > -1) {
        periodIndex = i;
        pointIndex = index;
        break;
      }
    }
    if (periodIndex > -1) {
      const targetPeriod = this.periods[periodIndex];
      if (targetPeriod.timings[pointIndex + 1]) {
        return targetPeriod.timings[pointIndex + 1];
      } else {
        if (periodIndex < this.periods.length - 1) {
          return this.weatherPoints[periodIndex]?.timing;
        }
      }
    }
    return;
  }
  get partialStartAlertPoint() {
    return this.weatherPoints[this.selectPeriodIndex - 1];
  }
  get partialEndAlertPoint() {
    return this.weatherPoints[this.selectPeriodIndex];
  }
  isSliceLeft(p: Point) {
    return p.timing.startTime === this.sliceTimeStrings[0];
  }
  isEndpointSliceLeft(t: string) {
    return t === this.sliceTimeStrings[0];
  }
  isEndpointSliceRight(t: string) {
    return t === this.sliceTimeStrings[1];
  }
  isSliceRight(p: Point) {
    return p.timing.startTime === this.sliceTimeStrings[1];
  }
  get rate() {
    return this.autoPlayService.rate;
  }
  get progressDuration() {
    return this.duration + 'ms';
  }
}
