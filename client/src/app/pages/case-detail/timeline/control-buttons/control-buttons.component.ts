import { Component, EventEmitter, Input, Output } from '@angular/core';
import { LibraryNzModule } from '../../../../library.nz.module';
import {
  AutoPlayService,
  AutoPlayState,
} from '../../services/auto-play.service';
import { MapService } from './../../services/map.service';

const rates = [1, 2, 4];

@Component({
  selector: 'timeline-control-buttons',
  imports: [LibraryNzModule],
  templateUrl: './control-buttons.component.html',
  styleUrl: './control-buttons.component.less',
  host: {
    class: 'text-center relative',
    style: 'width: calc(100% - 400px)',
  },
})
export class ControlButtonsComponent {
  @Input() autoPlaying = false;
  @Input() sliceMode = false;
  @Input() viewingRange = 0;
  @Input() previousDisabled: boolean = false;
  @Input() nextDisabled: boolean = false;
  @Input() processDisabled: boolean = false;
  @Input() autoPlayDisabled: boolean = true;
  @Output() previousHandler = new EventEmitter();
  @Output() nextHandler = new EventEmitter();
  @Output() autoPlayHandler = new EventEmitter();
  @Output() rateHandler = new EventEmitter<number>();
  @Output() viewingRangeHandler = new EventEmitter<number>();
  viewingRangeForbidden = false;
  @Input() autoPlayState: AutoPlayState = AutoPlayState.INITIALIZED;
  stopping: boolean = false;
  rates = rates;
  currentRate = rates[0];
  constructor(
    private readonly autoplayService: AutoPlayService,
    private readonly mapService: MapService,
  ) {
    this.mapService.$viewingRangeForbidden.subscribe((forbidden) => {
      this.viewingRangeForbidden = forbidden;
    });
  }
  onRateChange(r: number) {
    this.currentRate = r;
    this.rateHandler.emit(r);
  }
  onPreviousClick() {
    this.previousHandler.emit();
  }
  onNextClick() {
    this.nextHandler.emit();
  }
  onAutoPlayClick() {
    if (this.autoPlayDisabled) return;
    this.autoPlayHandler.emit();
  }
  onProcessClick() {
    if (this.processDisabled) return;
    if (this.stopping) {
      this.onResumeClick();
    } else {
      this.onPauseClick();
    }
  }
  onPauseClick() {
    this.stopping = true;
    this.autoplayService.pause();
  }
  onResumeClick() {
    this.stopping = false;
    this.autoplayService.resume();
  }
  onQuitClick() {
    this.stopping = false;
    this.autoplayService.quit();
  }
  onViewingRangeClick(number: number) {
    if (this.composedViewRangeForbidden) return;
    this.viewingRangeHandler.emit(number);
  }

  get composedViewRangeForbidden() {
    if (this.autoPlayState === AutoPlayState.RUNNING) {
      return this.viewingRangeForbidden;
    }
    return false;
  }
}
