import { Component, ElementRef, Input, ViewChild } from '@angular/core';
import gsap from 'gsap';
import { NzImageService } from 'ng-zorro-antd/image';
import { take } from 'rxjs';
import { waitForSeconds } from '../../../../app.util';
import { LibraryNzModule } from '../../../../library.nz.module';
import { MediaPlayService } from '../../services/media.play.service';
import {
  BOTTOM_PADDING_PERCENT,
  TOP_PADDING_PERCENT,
} from '../media-player-modal.component';

@Component({
  selector: 'image-reader',
  imports: [LibraryNzModule],
  templateUrl: './image-reader.component.html',
  styleUrl: './image-reader.component.less',
})
export class ImageReaderComponent {
  @ViewChild('target', { static: true }) target!: ElementRef;
  @Input() documentWidth = 0;
  @Input() documentHeight = 0;
  @Input() title = '';

  src = '';
  objectImagePath = '';
  loading = false;
  duration = 10; // show for 10 seconds
  progressTimeline: gsap.core.Timeline = gsap.timeline({ repeat: 0 });

  @ViewChild('progress', { static: true })
  progressRef?: ElementRef<HTMLDivElement>;
  constructor(
    private nzImageService: NzImageService,
    private mediaService: MediaPlayService,
  ) {
    mediaService.registerImageReader(this);
    this.src = mediaService.currentImageSrc;
  }
  ngAfterViewInit() {
    setTimeout(() => {
      this.setObjectImagePath(this.src);
    });
  }
  resetProgress() {
    this.progressDom &&
      this.progressTimeline.to(this.progressDom, {
        width: 0,
        duration: 0,
      });
  }

  animateProgress() {
    return this.progressTimeline.to(this.progressDom!, {
      width: 100 + '%',
      duration: this.duration,
    });
  }
  async imagePromise(src: string) {
    return new Promise((resolve, reject) => {
      fetch(src)
        .then((res) => res.blob()) // Gets the response and returns it as a blob
        .then((blob) => {
          let objectURL = URL.createObjectURL(blob);
          resolve(objectURL);
        })
        .catch((err) => {
          reject(err);
        });
    });
  }
  async setObjectImagePath(src: string) {
    this.loading = true;
    this.objectImagePath = '';
    this.resetProgress();
    const [objectURL] = await Promise.all([
      this.imagePromise(src),
      waitForSeconds(0.5),
    ]);
    this.loading = false;
    this.objectImagePath = objectURL as string;
    this.animateProgress().then(() => {
      this.onAnimationEnd();
    });
  }
  setSrc(src: string) {
    this.src = src;
    this.setObjectImagePath(this.src);
  }
  onAnimationEnd() {
    this.mediaService.consumeMtsByOrder();
  }
  onImageClick() {
    this.pauseAnimation();
    this.nzImageService
      .preview([{ src: this.objectImagePath }], {
        nzMaskClosable: false,
      })
      .previewInstance.closeClick.pipe(take(1))
      .subscribe(() => {
        this.resumeAnimation();
      });
  }
  pauseAnimation() {
    this.progressTimeline.pause();
  }
  resumeAnimation() {
    this.progressTimeline.resume();
  }
  ngOnDestroy() {
    this.progressTimeline.kill();
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
  get progressDom() {
    return this.progressRef?.nativeElement;
  }
}
