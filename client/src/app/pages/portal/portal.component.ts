import {
  Component,
  computed,
  ElementRef,
  signal,
  ViewChild,
} from '@angular/core';
import { RouterModule } from '@angular/router';
import { NzMessageService } from 'ng-zorro-antd/message';
import { debounceTime, fromEvent, tap } from 'rxjs';
import { CommonUserDropdownComponent } from '../../common.component/user-dropdown/user-dropdown.component';
import { ApiService } from './../../services/api.service';
import { SettingService } from './../../services/setting.service';

const cards = [
  {
    empty: true,
    title: '1',
    secondTitle: '1',
    image: '',
    link: '',
  },
  {
    title: '台风案例',
    secondTitle: '演示与教学系统',
    image: 'assets/images/portal/card-typhoon-icon.png',
    link: '/typhoon-library',
  },
  {
    title: '防汛防台',
    secondTitle: '应急态势指挥台',
    image: 'assets/images/portal/card-extreme-weather-icon.png',
    link: '/extreme-weather',
  },
  {
    title: '防汛防台',
    secondTitle: '数字预案',
    image: 'assets/images/portal/card-digital-plan-icon.png',
    link: '/digital-plan',
  },
  {
    empty: true,
    title: '1',
    secondTitle: '1',
    image: '',
    link: '',
  },
];
@Component({
  selector: 'app-portal',
  imports: [RouterModule, CommonUserDropdownComponent],
  templateUrl: './portal.component.html',
  styleUrl: './portal.component.less',
})
export class PortalComponent {
  @ViewChild('innerContainer') innerContainer!: ElementRef<HTMLDivElement>;
  @ViewChild('outerContainer') outerContainer!: ElementRef<HTMLDivElement>;
  @ViewChild('video') video!: ElementRef<HTMLVideoElement>;

  mouseEnter$ = fromEvent(window.document, 'mouseenter').pipe(
    debounceTime(300),
    tap(() => {
      this.startPlay();
    }),
  );
  resize$ = fromEvent(window, 'resize').pipe(
    debounceTime(300),
    tap(() => {
      this.resetScale();
    }),
  );

  validatingCommand = signal(false);
  commandExist = signal(false);

  constructor(
    private message: NzMessageService,
    private api: ApiService,
    private setting: SettingService,
  ) {
    this.mouseEnter$.subscribe();
    this.resize$.subscribe();
    setting.init();
  }

  // cards = [...cards, ...cards, ...cards, ...cards, ...cards];
  cards = [...cards];
  cardsContainerWidth = signal(600);

  cardWrapperWidth = computed(() => {
    return (this.cardsContainerWidth() * (1 - 0.16)) / 5;
  });

  currentIndex = computed(() => {
    return this.currentPage() * 5;
  });
  currentPage = signal(0);
  lampDots = computed(() => {
    const count = Math.floor(this.cards.length / 5);
    return Array.from({ length: count }, (_, index) => {
      return {
        active: index === this.currentPage(),
        index,
      };
    });
  });

  leftArrowDisabled = computed(() => {
    return this.currentPage() === 0;
  });
  rightArrowDisabled = computed(() => {
    return this.currentPage() === this.cards.length / 5 - 1;
  });

  ngAfterViewInit() {
    this.resetScale();
    setTimeout(() => {
      this.validate();
    });
  }
  async validate() {
    this.validateCommand()
      .then((res) => {
        if (res) {
          this.commandExist.set(true);
        } else {
          this.commandExist.set(false);
        }
      })
      .catch(() => {
        this.commandExist.set(false);
      });
  }
  resetScale() {
    this.setScreenSize();
    setTimeout(() => {
      this.cardsContainerWidth.set(
        this.outerContainer.nativeElement.clientWidth,
      );
    }, 10);
  }
  startPlay() {
    this.video?.nativeElement?.play();
  }
  async openLink(item: { link: string; empty?: boolean; banTip?: string }) {
    if (item.empty) return;
    if (item.banTip) {
      this.message.info(item.banTip);
      return;
    }
    if (this.validatingCommand()) return;
    if (item.link === '/extreme-weather') {
      this.validateCommand()
        .then((res) => {
          if (res) {
            this.onCommandValid();
          } else {
            this.onCommandInvalid();
          }
        })
        .catch(() => {});
      return;
    }
    window.open(item.link);
  }
  onCommandValid() {
    if (this.setting.isOccAdmin) {
      window.open('/occ');
      return;
    } else if (this.setting.isCoccAdmin) {
      window.open('/cocc');
      return;
    } else if (this.setting.isCommandAdmin) {
      window.open('/dispatch-center');
      return;
    } else if (this.setting.isAdmin) {
      window.open('/cocc');
      return;
    }
    this.message.warning('账号无对应进入权限');
  }

  onCommandInvalid() {
    if (
      this.setting.isCoccAdmin ||
      this.setting.isCommandAdmin ||
      this.setting.isAdmin
    ) {
      window.open('/extreme-weather');
    } else {
      this.message.warning('未开启指挥');
    }
  }

  validateCommand(): Promise<ExtremeCommand.InfoItem | null> {
    return new Promise((resolve, reject) => {
      this.validatingCommand.set(true);
      this.api.extreme
        .validateCommandPlatform()
        .then((res) => {
          if (res && Array.isArray(res)) {
            if (!res.length) {
              resolve(null);
            } else {
              // this.message.info('已存在指挥');
              resolve(res[0]);
            }
          } else {
            this.message.info('指挥台检测失败');
            reject();
          }
        })
        .catch((err) => {
          this.message.error(err?.message || '指挥台检测失败');
          reject();
        })
        .finally(() => {
          this.validatingCommand.set(false);
        });
    });
  }
  getCurvedRotation(index: number) {
    // const pos = index % 5;
    const pos = index - this.currentIndex();
    const angle = (pos - 2) * -3;
    const visibility =
      index >= this.currentIndex() && index < this.currentIndex() + 5
        ? 'visible'
        : 'hidden';
    let top = Math.abs(pos - 2) * -30;
    if (pos === 2) {
      top = -18;
    }
    return {
      transform: `perspective(500px) rotateZ(${angle}deg)`,
      transformOrigin: 'center',
      top: `${top + 18}px`,
      opacity: visibility === 'visible' ? 1 : 0,
    };
  }

  handleScroll(direction: 'left' | 'right') {
    if (direction === 'left') {
      // this.currentIndex.update((index) => index - 1);
      if (this.currentPage() > 0) {
        this.currentPage.update((page) => page - 1);
      }
    } else {
      if (this.currentPage() < this.cards.length / 5 - 1) {
        this.currentPage.update((page) => page + 1);
      }
    }
  }

  getInnerContainerTransform() {
    const w = this.cardsContainerWidth() - 64;
    return `translateX(${this.currentPage() * -w}px)`;
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
  getScreenSize() {
    return {
      width: document.documentElement.clientWidth,
      height: document.documentElement.clientHeight,
    };
  }
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
}
