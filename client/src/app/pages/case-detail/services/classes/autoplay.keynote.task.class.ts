import {
  FormattedKeyEventDto,
  KeyEventType,
  formatKeyEvent,
} from './../key-event-react.service';
import { AutoPlayTask, AutoPlayTaskConfig } from './autoplay.task.class';
import { Typhoon } from './typhoon.class';

export class AutoPlayKeynoteTask extends AutoPlayTask {
  dto: FormattedKeyEventDto;

  locateStartTime: number = 0;
  effectStartTime: number = 0;
  pauseTime: number = 0;
  elapsedTime: number = 0;

  constructor(config: AutoPlayTaskConfig) {
    super(config);
    this.dto = formatKeyEvent(config.events[0], this.utils);
  }

  override setDuration() {
    if (this.isPopup) {
      this.duration = (10 * 1000) / this.getRate();
      return;
    }
    // 3 秒 fly
    // 3 秒 locate
    // 60 秒 effect
    this.duration = (3 + 3 + 60) * 1000;
  }
  override run(): void {
    if (this.isPopup) {
      this.popupRun();
      return;
    }
    this.reportRun();
  }
  popupRun() {
    this.typhoonModel?.cancelAnimation();
    this.belongs.effectMap();
    // this.effectStartTime = 0;
    this.effectStartTime = new Date().getTime();
    this.effectKeyEvent();
    this.timer = setTimeout(() => {
      this.finish();
    }, this.duration);
  }
  reportRun() {
    this.typhoonModel?.cancelAnimation();
    this.locate();
    // setTimeout(() => {
    this.belongs.effectMap();
    // }, 2000);
    this.locateStartTime = new Date().getTime();
    this.effectStartTime = 0;
    this.elapsedTime = 0;
    this.timer = setTimeout(
      () => {
        this.effectStartTime = new Date().getTime();
        this.effectKeyEvent();
        this.timer = setTimeout(
          () => {
            this.finish();
          },
          this.duration - (3 + 3) * 1000,
        );
      },
      (3 + 3) * 1000,
    );
  }
  locate() {
    this.typhoonModel!.animation.onTickDone = undefined;
    setTimeout(() => {
      this.service.localEventReactService.locateEvent(this.events[0], 15, true);
    }, 700);
  }
  override onTickDone(typhoon: Typhoon) {}
  override pause(): void {
    if (this.isPopup) {
      this.pausePopup();
      return;
    }
    this.pauseReport();
  }

  pausePopup() {
    this.pauseTime = new Date().getTime();
    clearTimeout(this.timer);
  }
  pauseReport() {
    this.pauseTime = new Date().getTime();
    clearTimeout(this.timer);
  }
  override resume(): void {
    if (this.isPopup) {
      this.resumePopup();
      return;
    }
    this.resumeReport();
  }
  resumePopup() {
    const currentElapsedTime = new Date().getTime() - this.pauseTime;
    this.elapsedTime += currentElapsedTime;
    const calcLocateStartTime = this.effectStartTime + this.elapsedTime;
    this.timer = setTimeout(
      () => {
        this.finish();
      },
      this.duration - (new Date().getTime() - calcLocateStartTime),
    );
  }
  resumeReport() {
    const currentElapsedTime = new Date().getTime() - this.pauseTime;
    this.elapsedTime += currentElapsedTime;
    const calcLocateStartTime = this.locateStartTime + this.elapsedTime;
    if (!this.effectStartTime) {
      this.timer = setTimeout(() => {
        this.effectStartTime = new Date().getTime();
        this.effectKeyEvent();
        this.timer = setTimeout(
          () => {
            this.finish();
          },
          this.duration - (3 + 3) * 1000,
        );
      }, 3000 - this.elapsedTime);
    } else {
      this.timer = setTimeout(
        () => {
          this.finish();
        },
        this.duration - (new Date().getTime() - calcLocateStartTime),
      );
    }
  }
  override finish(): void {
    clearTimeout(this.timer);
    super.finish();
  }
  override quit(): void {
    clearTimeout(this.timer);
    super.quit();
  }
  get isPopup() {
    return this.dto.type === KeyEventType.popup;
  }
  get isReport() {
    return this.dto.type === KeyEventType.report;
  }
}
