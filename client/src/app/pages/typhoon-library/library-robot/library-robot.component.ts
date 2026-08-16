import {
  Component,
  ElementRef,
  EventEmitter,
  Input,
  OnChanges,
  OnDestroy,
  OnInit,
  Output,
  SimpleChanges,
  ViewChild,
  signal,
} from '@angular/core';

const FRAMES = Array.from(
  { length: 31 },
  (_, i) => `assets/images/robot/IMG_${4743 + i}.webp`,
);

@Component({
  selector: 'library-robot',
  standalone: true,
  imports: [],
  templateUrl: './library-robot.component.html',
  styleUrl: './library-robot.component.less',
})
export class LibraryRobotComponent implements OnInit, OnChanges, OnDestroy {
  @Input() fps = 12;
  @Input() loop = true;
  @Output() robotClick = new EventEmitter<void>();

  loaded = signal(false);

  @ViewChild('canvas', { static: true })
  canvasRef!: ElementRef<HTMLCanvasElement>;

  private ctx!: CanvasRenderingContext2D;
  private images: HTMLImageElement[] = [];
  private frameIndex = 0;
  private timer: ReturnType<typeof setInterval> | null = null;
  private destroyed = false;

  ngOnInit() {
    const canvas = this.canvasRef.nativeElement;
    const dpr = window.devicePixelRatio || 1;
    const size = 256;
    canvas.width = size * dpr;
    canvas.height = size * dpr;
    this.ctx = canvas.getContext('2d')!;
    this.ctx.scale(dpr, dpr);

    this.preloadAll().then(() => {
      this.loaded.set(true);
      this.drawFrame(0);
      this.startAnimation();
    });

    this.delayPreloadPanelBg();
  }

  ngOnChanges(changes: SimpleChanges) {
    if (changes['loop'] && !changes['loop'].firstChange) {
      if (
        changes['loop'].currentValue &&
        !this.timer &&
        this.images.length > 0
      ) {
        this.frameIndex = 0;
        this.drawFrame(0);
        this.startAnimation();
      }
    }
  }

  ngOnDestroy() {
    this.destroyed = true;
    this.stopAnimation();
  }

  onClick() {
    this.robotClick.emit();
  }

  preloadPanelBg() {
    return new Promise<HTMLImageElement>((resolve) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = () => resolve(img);
      img.src = 'assets/images/typhoon-library/robot-panel/panel-bg.png';
    });
  }

  delayPreloadPanelBg() {
    window.requestAnimationFrame(() => {
      this.preloadPanelBg();
    });
  }

  private preloadAll(): Promise<void> {
    return Promise.all(
      FRAMES.map(
        (src) =>
          new Promise<HTMLImageElement>((resolve) => {
            const img = new Image();
            img.onload = () => resolve(img);
            img.onerror = () => resolve(img);
            img.src = src;
          }),
      ),
    ).then((imgs) => {
      this.images = imgs;
    });
  }

  private drawFrame(index: number) {
    const img = this.images[index];
    if (!img?.complete) return;
    this.ctx.clearRect(0, 0, 256, 256);
    this.ctx.drawImage(img, 0, 0, 256, 256);
  }

  private startAnimation() {
    this.stopAnimation();
    this.timer = setInterval(() => {
      this.frameIndex++;
      if (this.frameIndex >= FRAMES.length) {
        if (this.loop) {
          this.frameIndex = 0;
        } else {
          this.frameIndex = FRAMES.length - 1;
          this.stopAnimation();
          return;
        }
      }
      this.drawFrame(this.frameIndex);
    }, 1000 / this.fps);
  }

  private stopAnimation() {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }
}
