import {
  Component,
  computed,
  ElementRef,
  input,
  output,
  signal,
  ViewChild,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { fromEvent } from 'rxjs';
import { debounceTime, distinctUntilChanged } from 'rxjs/operators';

@Component({
  selector: 'weather-carousel',
  imports: [],
  templateUrl: './weather-carousel.component.html',
  styleUrl: './weather-carousel.component.less',
})
export class WeatherCarouselComponent {
  @ViewChild('innerContainer') innerContainer!: ElementRef<HTMLDivElement>;
  @ViewChild('outerContainer') outerContainer!: ElementRef<HTMLDivElement>;

  customOptions = input<{ name: string; icon: string }[]>([]);
  allOptions = computed(() => [
    ...this.customOptions(),
    ...this.defaultOptions,
  ]);
  value = input<string | number>('');
  onChange = output<string | number>();

  resize$ = fromEvent(window, 'resize').pipe(
    debounceTime(100),
    distinctUntilChanged(),
    takeUntilDestroyed(),
  );

  private startCardRect = {
    width: 243.7, // will reset
    height: 337, // will reset
    gap: 58,
  };
  containerWidth = computed(() => {
    return this.cardRect().width * 5 + this.cardRect().gap * 6;
  });
  cardRect = computed(() => {
    return {
      width: this.startCardRect.width * this.scale(),
      height: this.startCardRect.height * this.scale(),
      gap: this.startCardRect.gap * this.scale(),
    };
  });

  getScreenSize() {
    return {
      width: document.documentElement.clientWidth,
      height: document.documentElement.clientHeight,
    };
  }
  private _screenSize = signal({
    width: 1920,
    height: 1080,
  });
  readonly screenSize = computed(() => this._screenSize());
  readonly standardScreenSize = Object.freeze({
    width: 1920,
    height: 1080,
  });
  setScreenSize() {
    const size = this.getScreenSize();
    this._screenSize.set(size);
    return size;
  }
  scale = computed(() => {
    return Math.min(
      this.screenSize().width / this.standardScreenSize.width,
      this.screenSize().height / this.standardScreenSize.height,
    );
  });

  defaultOptions = [
    {
      name: '雷电',
      icon: '/assets/images/extreme-weather/weather-carousel/thunder.png',
    },
    {
      name: '暴雨',
      icon: '/assets/images/extreme-weather/weather-carousel/rain.png',
    },
    {
      name: '冰雹',
      icon: '/assets/images/extreme-weather/weather-carousel/hail.png',
    },
    {
      name: '大风',
      icon: '/assets/images/extreme-weather/weather-carousel/wind.png',
    },
    {
      name: '寒潮',
      icon: '/assets/images/extreme-weather/weather-carousel/cold.png',
    },
    {
      name: '雷电',
      icon: '/assets/images/extreme-weather/weather-carousel/thunder.png',
    },
    {
      name: '暴雨',
      icon: '/assets/images/extreme-weather/weather-carousel/rain.png',
    },
    {
      name: '冰雹',
      icon: '/assets/images/extreme-weather/weather-carousel/hail.png',
    },
    {
      name: '大风',
      icon: '/assets/images/extreme-weather/weather-carousel/wind.png',
    },
    {
      name: '寒潮',
      icon: '/assets/images/extreme-weather/weather-carousel/cold.png',
    },
    {
      name: '雷电',
      icon: '/assets/images/extreme-weather/weather-carousel/thunder.png',
    },
    {
      name: '暴雨',
      icon: '/assets/images/extreme-weather/weather-carousel/rain.png',
    },
    {
      name: '冰雹',
      icon: '/assets/images/extreme-weather/weather-carousel/hail.png',
    },
    {
      name: '大风',
      icon: '/assets/images/extreme-weather/weather-carousel/wind.png',
    },
    {
      name: '寒潮',
      icon: '/assets/images/extreme-weather/weather-carousel/cold.png',
    },
    {
      name: '雷电',
      icon: '/assets/images/extreme-weather/weather-carousel/thunder.png',
    },
    {
      name: '暴雨',
      icon: '/assets/images/extreme-weather/weather-carousel/rain.png',
    },
    {
      name: '冰雹',
      icon: '/assets/images/extreme-weather/weather-carousel/hail.png',
    },
    {
      name: '大风',
      icon: '/assets/images/extreme-weather/weather-carousel/wind.png',
    },
    {
      name: '寒潮',
      icon: '/assets/images/extreme-weather/weather-carousel/cold.png',
    },
    {
      name: '雷电',
      icon: '/assets/images/extreme-weather/weather-carousel/thunder.png',
    },
    {
      name: '暴雨',
      icon: '/assets/images/extreme-weather/weather-carousel/rain.png',
    },
    {
      name: '冰雹',
      icon: '/assets/images/extreme-weather/weather-carousel/hail.png',
    },
    {
      name: '大风',
      icon: '/assets/images/extreme-weather/weather-carousel/wind.png',
    },
    {
      name: '寒潮',
      icon: '/assets/images/extreme-weather/weather-carousel/cold.png',
    },
    {
      name: '雷电',
      icon: '/assets/images/extreme-weather/weather-carousel/thunder.png',
    },
    {
      name: '暴雨',
      icon: '/assets/images/extreme-weather/weather-carousel/rain.png',
    },
    {
      name: '冰雹',
      icon: '/assets/images/extreme-weather/weather-carousel/hail.png',
    },
    {
      name: '大风',
      icon: '/assets/images/extreme-weather/weather-carousel/wind.png',
    },
    {
      name: '寒潮',
      icon: '/assets/images/extreme-weather/weather-carousel/cold.png',
    },
  ];

  ngAfterViewInit() {
    this.resetScale();
  }

  ngOnInit() {
    this.resize$.subscribe(() => {
      this.resetScale();
    });
  }

  onItemClick(value: string | number) {
    this.onChange.emit(value);
  }

  resetScale() {
    this.setScreenSize();
  }

  currentPageIndex = signal(0);
  leftArrayVisible = computed(() => {
    return this.currentPageIndex() > 0 && this.allOptions().length > 5;
  });
  rightArrayVisible = computed(() => {
    return this.currentPageIndex() * 5 < this.allOptions().length - 5;
  });

  onLeftArrowClick() {
    if (this.leftArrayVisible()) {
      this.currentPageIndex.update((index) => index - 1);
    }
  }

  getInnerTransform() {
    return `translateX(${this.currentPageIndex() * (this.cardRect().gap - this.containerWidth())}px)`;
  }

  onRightArrowClick() {
    if (this.rightArrayVisible()) {
      this.currentPageIndex.update((index) => index + 1);
    }
  }

  getGradualHideBoolean(index: number) {
    return (
      index < this.currentPageIndex() * 5 ||
      index >= (this.currentPageIndex() + 1) * 5
    );
  }

  turnTo(index: number) {
    this.currentPageIndex.set(index);
  }
}
