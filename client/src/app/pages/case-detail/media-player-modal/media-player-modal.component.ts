import {
  animate,
  state,
  style,
  transition,
  trigger,
} from '@angular/animations';
import { Component, HostBinding } from '@angular/core';
import { waitForSeconds } from '../../../app.util';
import { LibraryNzModule } from '../../../library.nz.module';
import {
  IOpenMediaParams,
  MediaPlayService,
} from '../services/media.play.service';
import { UtilsService } from '../services/utils.service';
import { ImageReaderComponent } from './image-reader/image-reader.component';
import { VideoPlayerComponent } from './video-player/video-player.component';

window.HELP_IMPROVE_VIDEOJS = false;

export const HOLDER_SPACE_PIXELS = 230;
export const TOP_PADDING_PERCENT = 0.1;
export const BOTTOM_PADDING_PERCENT = 0.01;

@Component({
  selector: 'media-player-modal',
  imports: [LibraryNzModule, VideoPlayerComponent, ImageReaderComponent],
  animations: [
    trigger('scale', [
      state('in', style({ width: '90vw', height: '90vh', opacity: 1 })),
      transition('void => *', [
        style({ width: '0vw', height: '0vh', opacity: 0 }),
        animate(500),
      ]),
      transition('* => void', [
        animate(500, style({ width: '0vw', height: '0vh', opacity: 0 })),
      ]),
    ]),
  ],
  templateUrl: './media-player-modal.component.html',
  styleUrl: './media-player-modal.component.less',
})
export class MediaPlayerModalComponent {
  @HostBinding('class')
  class: string = '';

  documentWidth = 1920;
  documentHeight = 919;

  mediaType = 'video';
  visible = false;
  audioTitle = '';
  mediaTitle = '';
  showLeftArrow = false;
  showRightArrow = false;
  constructor(
    private readonly utils: UtilsService,
    private readonly mediaService: MediaPlayService,
  ) {
    this.mediaService.registerModal(this);
  }
  ngAfterViewInit() {
    this.setProportion();
  }
  setProportion() {
    const { width, height } = document.documentElement.getBoundingClientRect();
    setTimeout(() => {
      this.documentWidth = width;
      this.documentHeight = height;
    });
  }
  async close() {
    this.visible = false;
    await waitForSeconds(0.5);
    this.class = '';
  }
  open({
    mediaTitle,
    mediaType,
    audioTitle,
    hasNext,
    hasPrevious,
  }: IOpenMediaParams) {
    this.class = 'visible';
    this.mediaType = mediaType || 'video';
    this.mediaTitle = mediaTitle || '';
    this.audioTitle = audioTitle || '';
    this.showLeftArrow = hasPrevious || false;
    this.showRightArrow = hasNext || false;
    setTimeout(() => {
      this.visible = true;
    });
  }
  async handleButtonClose() {
    await this.close();
    this.mediaService.finish();
  }
  handleProcessClick(direction: 'left' | 'right') {
    if (direction === 'left') {
      this.mediaService.previous();
    } else {
      this.mediaService.next();
    }
  }
  get modalHeight() {
    return (
      this.documentHeight -
      HOLDER_SPACE_PIXELS * (1 + TOP_PADDING_PERCENT + BOTTOM_PADDING_PERCENT)
    );
  }
}
