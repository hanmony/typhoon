import { Component, EventEmitter, Input, Output } from '@angular/core';
import { Subscription, fromEvent } from 'rxjs';
import { findAncestorWithAttribute } from '../../../app.util';
import { CaseDto } from '../../../domain/case.dto';
import { ComposeOption, FilterModel } from '../case-detail.component';
import { AutoPlayService, AutoPlayState } from '../services/auto-play.service';
import { LOCAL_CATEGORY_KEY, UtilsService } from '../services/utils.service';

export const STOP_POPPING_ATTR = 'stop-popping';

@Component({
  selector: 'case-detail-header',
  imports: [],
  templateUrl: './header.component.html',
  styleUrl: './header.component.less',
  host: {
    class: 'fixed top-0 w-screen',
    style: 'z-index: 1009',
  },
})
export class CaseDetailHeaderComponent {
  @Input() data?: CaseDto;
  @Output() onFilterChange = new EventEmitter<{
    key: LOCAL_CATEGORY_KEY;
    option: ComposeOption;
  }>();
  @Output() onFilterBundleChange = new EventEmitter<LOCAL_CATEGORY_KEY>();
  @Output() toggleFilterModal = new EventEmitter<void>();
  @Input({ required: true }) filterModel!: FilterModel;

  listen$?: Subscription;
  optionsVisible = false;

  autoPlaying = false;
  zoom = 1;
  constructor(
    private utils: UtilsService,
    private readonly autoPlayService: AutoPlayService,
  ) {}
  ngAfterViewInit() {
    // this.autoPlaying = this.autoPlayService
    this.autoPlayService.autoPlayStateChangeSubject$.subscribe((state) => {
      if (state === AutoPlayState.RUNNING) {
        this.autoPlaying = true;
      } else if (
        state === AutoPlayState.FINISHED ||
        state === AutoPlayState.TERMINATED
      ) {
        this.autoPlaying = false;
      }
    });
    this.setZoom();
  }
  openOptions() {
    this.optionsVisible = true;
    setTimeout(() => {
      this.addListener();
    });
  }
  closeOptions() {
    this.optionsVisible = false;
    this.removeListener();
  }
  toggleOptions() {
    if (this.optionsVisible) {
      this.closeOptions();
    } else {
      this.openOptions();
    }
  }
  handleFilterButtonClick() {
    if (this.autoPlaying) return;
    this.toggleFilterModal.emit();
  }
  onValueChange(option: ComposeOption, key: LOCAL_CATEGORY_KEY) {
    this.onFilterChange.emit({
      option,
      key,
    });
  }
  setZoom() {
    return new Promise((resolve) => {
      setTimeout(() => {
        const w = document.documentElement.offsetWidth;
        const rate = w / 1920;
        this.zoom = rate < 1 ? rate : 1;
        resolve(null);
      });
    });
  }
  onAllChange(key: LOCAL_CATEGORY_KEY) {
    this.onFilterBundleChange.emit(key);
  }

  addListener() {
    this.listen$ = fromEvent(document, 'click').subscribe((e: Event) => {
      if (
        e.target &&
        !findAncestorWithAttribute(e.target as HTMLElement, STOP_POPPING_ATTR)
      ) {
        this.optionsVisible = false;
        this.removeListener();
      }
    });
  }
  removeListener() {
    if (this.listen$) {
      this.listen$?.unsubscribe();
      this.listen$ = undefined;
    }
  }

  get totalEvents() {
    return this.utils.serializedEventsDto;
  }
}
