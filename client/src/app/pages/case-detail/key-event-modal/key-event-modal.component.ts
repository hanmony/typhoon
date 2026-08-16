import {
  Component,
  ElementRef,
  EventEmitter,
  Output,
  ViewChild,
} from '@angular/core';
import {
  horizontalInOutCenter,
  horizontalInOutRelative,
  scaleInOut,
} from '../../../common.animation';
import { ActionDto } from '../../../domain/action.dto';
import { LibraryNzModule } from '../../../library.nz.module';
import { AutoPlayService } from '../services/auto-play.service';
import {
  KeyEventReactService,
  KeyEventType,
  type FormattedKeyEventDto,
} from '../services/key-event-react.service';
import { UtilsService } from '../services/utils.service';
import { AutoPlayState } from './../services/auto-play.service';

@Component({
  selector: 'key-event-modal',
  imports: [LibraryNzModule],
  animations: [horizontalInOutCenter, scaleInOut, horizontalInOutRelative],
  templateUrl: './key-event-modal.component.html',
  styleUrl: './key-event-modal.component.less',
})
export class KeyEventModalComponent {
  currentPopupDto?: FormattedKeyEventDto;
  popupVisible: boolean = false;
  currentReportDto?: FormattedKeyEventDto;
  reportVisible: boolean = false;
  dto?: FormattedKeyEventDto;
  @ViewChild('detailWrapperRef') detailWrapperRef?: ElementRef<HTMLDivElement>;
  @Output() accessoryHandler = new EventEmitter<ActionDto>();
  detailHeight: number = 0;
  detailScrollHeight: number = 0;
  shouldScrollCount: number = 0;
  scrollDuration: number = 60000;
  scrollDurationPerTime = 0;
  scrolledCount: number = 0;
  /** 暂停时间戳  */
  pauseTime = 0;
  /** 当前轮启动时间戳  */
  startScrollTime = 0;
  /** 当前轮启动到暂停已经消耗的时间  */
  elapsedTime = 0;
  timer?: NodeJS.Timeout;

  hasAccessory: boolean = false;
  basicItems = [
    { label: '发生时间', value: '' },
    { label: '事件地点', value: '' },
    { label: '相关人员', value: '' },
    { label: '所属单位', value: '' },
    { label: '认定等级', value: '' },
  ];
  additionalItems = [
    { label: '填报单位', value: '' },
    { label: '填报时间', value: '' },
    { label: '填报人', value: '' },
    { label: '负责人', value: '' },
  ];
  detailInfo: {
    label: string;
    description?: string;
    items?: { time?: string; content: string }[];
    list?: string[];
  }[] = [
    { label: '事件概况' },
    { label: '排故处置' },
    { label: '救援连挂' },
    { label: '运营质量影响情况' },
    { label: '原因分析' },
    { label: '应急处置过程分析' },
    { label: '事件责任认定' },
    { label: '整改措施及建议' },
    { label: '事件材料清单（材料附后）' },
    { label: '分析成员名单' },
  ];
  constructor(
    private readonly reactService: KeyEventReactService,
    private readonly utils: UtilsService,
    private readonly autoPlay: AutoPlayService,
  ) {
    this.autoPlay.autoPlayStateChangeSubject$.subscribe((state) => {
      if (state) {
        if (state === AutoPlayState.PAUSED) {
          this.pauseTime = Date.now();
          this.stopScroll();
        } else if (state === AutoPlayState.RUNNING) {
          if (this.pauseTime) {
            this.pauseTime = 0;
            this.revertScroll();
          }
        } else {
          this.pauseTime = 0;
          this.elapsedTime = 0;
        }
      }
    });
  }
  ngAfterViewInit() {
    this.reactService.registerModal(this);
    this.setScrollParams();
  }
  setScrollParams() {
    if (this.detailWrapperRef) {
      this.detailHeight = this.detailWrapperRef.nativeElement.offsetHeight;
      this.detailScrollHeight =
        this.detailWrapperRef.nativeElement.scrollHeight;
      this.shouldScrollCount = Math.ceil(
        this.detailScrollHeight / (this.detailHeight * 0.85),
      );
      this.scrollDurationPerTime = this.scrollDuration / this.shouldScrollCount;
      this.scrolledCount = 0;
    }
  }
  autoScrollDetail() {
    this.scrollHandler();
  }
  scrollHandler() {
    if (!this.detailWrapperRef) return;
    const dom = this.detailWrapperRef.nativeElement;
    let count = this.shouldScrollCount - this.scrolledCount;
    if (count) {
      this.startScrollTime = Date.now();
      this.timer = setTimeout(() => {
        dom.scroll({
          top: dom.scrollTop + this.detailHeight * 0.85,
          behavior: 'smooth',
        });
        this.elapsedTime = 0;
        this.scrolledCount++;
        this.scrollHandler();
      }, this.scrollDurationPerTime - this.elapsedTime);
    }
  }
  stopScroll() {
    clearTimeout(this.timer);
    this.elapsedTime =
      this.elapsedTime + (this.pauseTime - this.startScrollTime);
  }
  revertScroll() {
    this.scrollHandler();
  }
  show(dto: FormattedKeyEventDto) {
    this.dto = dto;
    if (dto.type === KeyEventType.popup) {
      this.popup(dto);
    } else if (dto.type === KeyEventType.report) {
      this.report(dto);
    }
    if (this.autoPlay.state === AutoPlayState.RUNNING) {
      this.hasAccessory = false;
    } else {
      this.hasAccessory = this.utils.hasAccessory(dto.rawEvent);
    }
  }
  popup(dto: FormattedKeyEventDto) {
    this.currentPopupDto = dto;
    this.popupVisible = true;
  }
  report(dto: FormattedKeyEventDto) {
    this.currentReportDto = dto;
    this.reportVisible = true;
    this.setData(dto);
    setTimeout(() => {
      this.setScrollParams();
      if (this.autoPlay.state === AutoPlayState.RUNNING) {
        this.autoScrollDetail();
      }
    }, 100);
  }
  setData(dto: FormattedKeyEventDto) {
    const map = this.getMap(dto);
    this.setBasicData(map);
    this.setDetailData(map);
    this.setAdditionalData(map);
  }
  getMap(dto: FormattedKeyEventDto) {
    const { items } = dto.rawEvent;
    const keyPrefix = '字段名';
    const keyRegExp = new RegExp(`^${keyPrefix}(\\d+)$`);

    return Object.entries(items).reduce(
      (acc, e) => {
        const [key, value] = e;
        const keyMatch = key.match(keyRegExp);
        if (keyMatch) {
          const [k, v] = value.split('\\n');
          if (k && v) {
            acc[k] = v;
          }
        } else {
          acc[key] = value;
        }
        return acc;
      },
      {} as Record<string, string>,
    );
  }
  setBasicData(map: Record<string, string>) {
    this.basicItems.forEach((e) => {
      const v = map[e.label];
      if (v) {
        e.value = v;
      }
    });
  }
  setAdditionalData(map: Record<string, string>) {
    this.additionalItems.forEach((e) => {
      const v = map[e.label];
      if (v) {
        e.value = v;
      }
    });
  }
  setDetailData(map: Record<string, string>) {
    this.detailInfo.forEach((e) => {
      e.description = undefined;
      e.items = undefined;
      e.list = undefined;

      const v = map[e.label];
      if (!v) return;
      const pureV = v.replace(/\n/g, '');

      const itemRegex = /(\d+:\d+)(.*?(?=\d+:\d+|$))/gs;
      const isItem = pureV.match(itemRegex);

      const listRegex = /(?:\d+、)(.*?(?=\d+、|$))/gs;
      const isList = pureV.match(listRegex);

      const durationRegex =
        /(\d+:\d+\s*-\s*\d+:\d+)(.*?(?=\d+:\d+\s*-\s*\d+:\d+|$))/gs;
      const isDuration = pureV.match(durationRegex);

      if (isList || isDuration || isItem) {
        const remainChars = (isList || isDuration || isItem)!.reduce(
          (acc, e) => {
            return acc.replace(e, '');
          },
          pureV,
        );
        e.description = remainChars;
      }

      if (isList) {
        e.list = isList.map((e) => {
          return e.replace(/^\d+、/, '');
        });
        e.description = undefined;
      } else if (isDuration || isItem) {
        const timeM = /(\d+:\d+(\s*-\s*\d+:\d+)?)/;
        e.items = (isDuration || isItem)!.map((e) => {
          return {
            time: e.match(timeM)![0],
            content: e.replace(timeM, ''),
          };
        });
      } else {
        e.description = v;
      }
    });
  }
  onReportCloseClick() {
    if (this.autoPlay.state === AutoPlayState.RUNNING) {
      this.autoPlay.queue?.currentTask?.finish();
    } else {
      this.closeReport();
    }
  }
  onPopupCloseClick() {
    if (this.autoPlay.state === AutoPlayState.RUNNING) {
      this.autoPlay.queue?.currentTask?.finish();
    } else {
      this.closePopup();
    }
  }
  closeReport() {
    this.reportVisible = false;
    this.cleanUp();
  }

  cleanUp() {
    clearTimeout(this.timer);
  }
  closePopup() {
    this.popupVisible = false;
  }
  clear() {
    this.closePopup();
    this.closeReport();
  }
  onPlayClick() {
    this.accessoryHandler.emit(this.dto!.rawEvent);
  }
}
