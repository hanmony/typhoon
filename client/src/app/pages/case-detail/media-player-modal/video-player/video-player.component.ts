import { Component, ElementRef, Input, ViewChild } from '@angular/core';
import videojs from 'video.js';
import Player from 'video.js/dist/types/player';
import {
  IVideoOptions,
  MediaPlayService,
} from '../../services/media.play.service';
import { TOP_PADDING_PERCENT } from '../media-player-modal.component';
import { BOTTOM_PADDING_PERCENT } from './../media-player-modal.component';

@Component({
  selector: 'video-player',
  imports: [],
  templateUrl: './video-player.component.html',
  styleUrl: './video-player.component.less',
})
export class VideoPlayerComponent {
  @ViewChild('target', { static: true }) target!: ElementRef;
  options: IVideoOptions = {
    // fluid: true,
    // aspectRatio: '16:9',
    autoplay: true,
    sources: [],
  };
  @Input() documentWidth = 0;
  @Input() documentHeight = 0;
  @Input() title = '';
  player?: Player;
  constructor(
    private el: ElementRef,
    private mediaService: MediaPlayService,
  ) {
    mediaService.registerVideoPlayer(this);
    this.options = mediaService.videoOptions;
  }
  load() {
    this.options = {
      ...this.options,
      ...this.mediaService.videoOptions,
    };
    this.player?.options(this.options);
    this.player?.src(this.options.sources);
  }
  ngOnInit() {}
  ngAfterViewInit() {
    setTimeout(() => {
      this.initInstance();
      this.registerListeners();
    }, 500);
  }
  initInstance() {
    this.player = videojs(this.target.nativeElement, {
      // height: this.containerHeight,
      // width: this.videoWidth,
      ...this.options,
    });
  }
  registerListeners() {
    this.player?.on('ready', () => {
      this.player?.play();
    });
    this.player?.on('ended', () => {
      this.mediaService.consumeMtsByOrder();
    });
  }
  ngOnDestroy() {
    if (this.player) {
      this.player.dispose();
    }
  }
  get topPadding() {
    return this.containerHeight * TOP_PADDING_PERCENT + 'px';
  }
  get bottomPadding() {
    return this.containerHeight * BOTTOM_PADDING_PERCENT + 'px';
  }
  get containerHeight() {
    return (this.containerWidth * 9) / 16;
  }
  get containerWidth() {
    return this.documentWidth * 0.68;
  }
}
