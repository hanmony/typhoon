import { Injectable } from '@angular/core';
import { ActionDto } from '../../../domain/action.dto';
import { ImageReaderComponent } from '../media-player-modal/image-reader/image-reader.component';
import { MediaPlayerModalComponent } from '../media-player-modal/media-player-modal.component';
import { VideoPlayerComponent } from '../media-player-modal/video-player/video-player.component';
import {
  AutoPlayMediaTask,
  MicroMediaTask,
} from './classes/autoplay.media.task.class';
import { UtilsService } from './utils.service';

function getFilePath(name: string) {
  return `${location.origin}/api/manager/editor/download-accessory?filename=${name}`;
}

export interface IVideoOptions {
  fluid?: boolean;
  aspectRatio?: string;
  autoplay: boolean;
  sources: {
    src: string;
    type?: string;
  }[];
}

export interface IOpenMediaParams {
  mediaTitle: string;
  mediaType?: string;
  audioTitle?: string;
  hasPrevious?: boolean;
  hasNext?: boolean;
}
@Injectable({
  providedIn: 'root',
})
export class MediaPlayService {
  protected _modal?: MediaPlayerModalComponent;
  protected _videoPlayer?: VideoPlayerComponent;
  protected _imageReader?: ImageReaderComponent;

  currentTask?: AutoPlayMediaTask;
  cacheMtType?: string;
  currentMt?: MicroMediaTask;
  currentMtIndex = -1;
  mts: MicroMediaTask[] = [];
  videoOptions: IVideoOptions = {
    // fluid: true,
    // aspectRatio: '16:9',
    autoplay: true,
    sources: [
      {
        // src: 'https://media.w3.org/2010/05/sintel/trailer_hd.mp4',
        src: 'assets/yu.mp4',
        // type: 'video/mp4',
      },
    ],
  };
  currentImageSrc = '';
  constructor(private readonly utils: UtilsService) {}
  registerModal(modal: MediaPlayerModalComponent) {
    this._modal = modal;
  }
  registerVideoPlayer(videoPlayer: VideoPlayerComponent) {
    this._videoPlayer = videoPlayer;
  }
  registerImageReader(imageReader: ImageReaderComponent) {
    this._imageReader = imageReader;
  }

  play(task: AutoPlayMediaTask) {
    this.cacheMtType = undefined;
    this.currentMtIndex = -1;
    this.currentTask = task;
    this.mts = task.microMediaTasks.slice();
    this.consumeMtsByOrder();
  }
  show(evs: ActionDto[]) {
    this.cacheMtType = undefined;
    this.currentMtIndex = -1;
    this.currentTask = undefined;
    this.mts = AutoPlayMediaTask.getMicroMediaTasks(evs);
    this.consumeMtsByOrder();
  }
  consumeMtsByOrder() {
    if (!this.nextMt) {
      this.finish();
      return;
    }
    const mt = this.nextMt;
    this.cacheMtType = this.currentMt?.type;
    this.currentMt = mt;
    this.currentMtIndex++;
    if (mt.type === 'video') {
      this.playVideo(mt);
    } else if (mt.type === 'image') {
      this.readImage(mt);
    } else if (mt.type === 'audio') {
      this.playAudio(mt);
    } else {
      this.consumeMtsByOrder();
    }
  }
  previous() {
    if (!this.previousMt) return;
    this.currentMtIndex = this.currentMtIndex - 2;
    this.cleanupEffect();
    this.consumeMtsByOrder();
  }
  next() {
    if (!this.nextMt) return;
    this.cleanupEffect();
    this.consumeMtsByOrder();
  }
  finish() {
    this.cleanupEffect();
    this.cacheMtType = undefined;
    this.currentTask?.finish();
    this.currentTask = undefined;
    this.currentMt = undefined;
    this.currentMtIndex = -1;
    this.mts = [];
    this.close();
  }
  cleanupEffect() {
    this._imageReader?.progressTimeline.kill();
  }
  open({ mediaType, audioTitle, mediaTitle }: IOpenMediaParams) {
    this._modal?.open(
      this.composeProcessFlag({ mediaType, audioTitle, mediaTitle }),
    );
  }
  composeProcessFlag(params: IOpenMediaParams): IOpenMediaParams {
    return {
      ...params,
      hasNext: !!this.nextMt,
      hasPrevious: !!this.previousMt,
    };
  }
  close() {
    this._modal?.close();
  }
  playVideo(mt: MicroMediaTask) {
    this.videoOptions = {
      ...this.videoOptions,
      sources: [
        {
          src: getFilePath(mt.source),
          type: mt.file.contentType,
        },
      ],
    };
    if (this.cacheMtType && this.cacheMtType !== 'image') {
      this._videoPlayer?.load();
    }
    this.open({ mediaType: 'video', mediaTitle: mt.title });
  }
  playAudio(mt: MicroMediaTask) {
    // this._audioPlayer?.play(mt);
    this.videoOptions = {
      ...this.videoOptions,
      sources: [
        {
          src: getFilePath(mt.source),
          type: mt.file.contentType,
        },
      ],
    };
    if (this.cacheMtType && this.cacheMtType !== 'image') {
      this._videoPlayer?.load();
    }
    this.open({
      mediaType: 'video',
      audioTitle: mt.file.originName,
      mediaTitle: mt.title,
    });
  }
  readImage(mt: MicroMediaTask) {
    const imageUrl = getFilePath(mt.source);
    this.currentImageSrc = imageUrl;
    this._imageReader?.setSrc(imageUrl);
    this.open({
      mediaType: 'image',
      mediaTitle: mt.title,
    });
  }
  get previousMt() {
    return this.mts[this.currentMtIndex - 1];
  }
  get nextMt() {
    return this.mts[this.currentMtIndex + 1];
  }
}
