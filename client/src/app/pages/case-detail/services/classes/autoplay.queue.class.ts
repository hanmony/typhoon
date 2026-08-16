import { v4 as uuidV4 } from 'uuid';
import { ActionCategory } from '../../../../domain/action.category';
import { ActionDto } from '../../../../domain/action.dto';
import { AutoPlayService } from '../auto-play.service';
import { SerializedEventsDto, TimeEventDto } from '../utils.service';
import { AutoPlayKeynoteTask } from './autoplay.keynote.task.class';
import { AutoPlayMediaTask } from './autoplay.media.task.class';
import { AutoPlayTask } from './autoplay.task.class';

export interface AutoPlayQueueConfig {
  service: AutoPlayService;
  rowEvents: ActionDto[];
  serializedEventsDto: SerializedEventsDto;
  timeEventDto: TimeEventDto;
}

export class AutoPlayQueue {
  id: string;
  service: AutoPlayService;
  tasks: AutoPlayTask[];
  _progressTasks: AutoPlayTask[] = [];
  rowEvents: ActionDto[];
  serializedEventsDto: SerializedEventsDto;
  timeEventDto: TimeEventDto;

  currentTask: AutoPlayTask | null = null;

  endTime: string = '';

  constructor(public config: AutoPlayQueueConfig) {
    this.id = uuidV4();
    this.service = config.service;
    this.rowEvents = config.rowEvents;
    this.serializedEventsDto = config.serializedEventsDto;
    this.timeEventDto = config.timeEventDto;
    this.tasks = this.getTasks();
  }
  setProgressingTasks(time?: string, endTime?: string) {
    const startIndex = this.tasks.findIndex(
      (t) => t.startTime === this.currentTask?.startTime,
    );
    const totalLength = this.tasks.length;
    if (endTime) {
      this._progressTasks = this.tasks.slice(
        startIndex,
        this.tasks.findIndex((t) => t.startTime === endTime) + 1,
      );
      return;
    }
    this._progressTasks = this.tasks.slice(startIndex, totalLength);
  }
  run(time?: string, endTime?: string): void {
    this.endTime = endTime || '';
    this.currentTask = this.tasks[0] || null;
    if (time) {
      this.currentTask = this.tasks.find((t) => t.startTime === time) || null;
    }
    this.setProgressingTasks(time, endTime);
    if (this.currentTask) {
      if (time) {
        this.combineGlobalEventPanelEffects(this.currentTask);
        this.currentTask.locateTyphoonImmediately();
      }
      this.service.autoPlayTaskChange(this.currentTask);
      this.currentTask.run();
    }
  }
  pause(): void {
    this.currentTask?.pause();
  }
  resume(): void {
    this.currentTask?.resume();
  }
  quit(): void {
    this.currentTask?.quit();
    this.currentTask = null;
    this.typhoonModel?.finishAutoPlay();
    this.clearPanel();
  }
  finish(): void {
    this.typhoonModel?.finishAutoPlay();
    this.currentTask = null;
    this.clearPanel();
    this.service.finish();
  }
  fakeFinish() {
    this.typhoonModel?.finishAutoPlay();
    this.currentTask = null;
    this.service.pause();
    this.service.finish();
  }
  clearPanel() {
    this.panelRef?.clearEvents();
  }
  combineGlobalEventPanelEffects(task: AutoPlayTask) {
    this.clearPanel();
    const index = this.tasks.findIndex((t) => t === task);
    if (index === -1) return;
    const passedTasks = this.tasks.slice(0, index);
    passedTasks.forEach((t) => {
      t.effectPanel();
    });
  }
  processNextTask(): void {
    this.currentTask = this.currentTask?.next || null;
    if (this.currentTask) {
      if (this.endTime) {
        if (
          new Date(this.currentTask.startTime).getTime() >
          new Date(this.endTime).getTime()
        ) {
          this.fakeFinish();
          return;
        }
      }
      this.service.autoPlayTaskChange(this.currentTask);
      this.currentTask.run();
    } else {
      this.fakeFinish();
    }
  }
  jumpToLastTiming() {
    if (!this.currentTask?.hasPreviousTiming) return;
    this.currentTask.quit();
    this.currentTask = this.currentTask.previousTiming!;
    this.combineGlobalEventPanelEffects(this.currentTask);
    this.currentTask.locateTyphoonImmediately();
    this.service.autoPlayTaskChange(this.currentTask);
    this.currentTask.run();
  }
  jumpToNextTiming() {
    if (!this.currentTask?.hasNextTiming) return;
    this.currentTask.quit();
    this.currentTask = this.currentTask.nextTiming!;
    this.combineGlobalEventPanelEffects(this.currentTask);
    this.currentTask.locateTyphoonImmediately();
    this.service.autoPlayTaskChange(this.currentTask);
    this.currentTask.run();
  }
  clear(): void {}
  getTasks(): AutoPlayTask[] {
    const tasks: AutoPlayTask[] = [];
    Array.from(this.timeEventDto).forEach(([startTime, categoryEventDto]) => {
      Array.from(categoryEventDto).forEach(([category, events]) => {
        const config = {
          service: this.service,
          startTime,
          category,
          events,
          belongs: this,
        };
        tasks.push(
          category === ActionCategory.keynote
            ? new AutoPlayKeynoteTask(config)
            : new AutoPlayTask(config),
        );
        const hasMediaEvents = events.filter(
          (e) => e.accessories && e.accessories.length > 0,
        );
        if (hasMediaEvents.length) {
          tasks.push(new AutoPlayMediaTask(config));
        }
      });
    });
    tasks.forEach((task, i) => {
      task.previous = tasks[i - 1];
      task.next = tasks[i + 1];
    });
    tasks.forEach((task) => {
      task.setCurrentTimingInBoundary();
    });
    tasks.forEach((task) => {
      task.setDuration();
    });
    return tasks;
  }
  onRateChange(r: number) {
    this.tasks.forEach((t) => {
      t.onRateChange(r);
    });
  }
  effectMap() {
    const time = this.currentTask?.startTime!;
    const currentCategory = this.currentTask?.category!;
    const events = this.rowEvents;
    this.service.effectMap(time, currentCategory, events);
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
}
