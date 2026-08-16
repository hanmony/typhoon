import { CommonModule } from '@angular/common';
import { Component, ElementRef, Input, ViewChild } from '@angular/core';

enum TEXT_DIRECTION {
  BOTTOM_LEFT = 'bottom-left',
  BOTTOM_RIGHT = 'bottom-right',
  RIGHT_BOTTOM = 'right-bottom',
}

@Component({
  selector: 'typhoon-indicator',
  imports: [CommonModule],
  templateUrl: './indicator.component.html',
  styleUrl: './indicator.component.less',
})
export class TyphoonIndicatorComponent {
  @Input() panelWidth = 450;
  @ViewChild('containerRef') containerRef?: ElementRef<HTMLDivElement>;
  @ViewChild('indicatorRef') indicatorRef?: ElementRef<HTMLDivElement>;
  topDistance = 80;
  angle = 0;
  leftDistance = 24;
  bottomDistance = 140;
  maxOffsetLeft = 820;
  maxOffsetTop = 80;
  anchorPoint = {
    x: 1470,
    y: 709 + this.topDistance,
  };
  typhoonState = {
    x: 0,
    y: 0,
    remainTime: 0,
  };
  indicatorRect = {
    width: 48,
    height: 48,
  };
  position = {
    visible: false,
    right: 0,
    bottom: 0,
  };
  remainTimeText = '';
  constructor() {}
  ngAfterViewInit() {
    this.setBoundary();
  }
  hide() {
    this.position = {
      visible: false,
      right: 0,
      bottom: 0,
    };
  }
  setBoundary() {
    if (!this.indicatorRef) return;
    const { width, height } = document.documentElement.getBoundingClientRect();
    const { height: indicatorHeight, width: indicatorWidth } =
      this.indicatorRef.nativeElement.getBoundingClientRect();

    setTimeout(() => {
      this.maxOffsetLeft =
        width - this.panelWidth - this.leftDistance - indicatorWidth;
      this.maxOffsetTop =
        height - indicatorHeight - this.topDistance - this.bottomDistance;

      this.indicatorRect = {
        width: indicatorWidth,
        height: indicatorHeight,
      };
      this.anchorPoint.x = width - this.panelWidth;
      this.anchorPoint.y = height - this.bottomDistance - 24;
    });
  }
  setState(x: number, y: number, remainTime: number) {
    this.typhoonState = {
      x,
      y,
      remainTime,
    };
  }
  setPosition() {
    const { x, y } = this.typhoonState;
    const disX = this.anchorPoint.x - x;
    const disY = this.anchorPoint.y - y;
    const boundaryX =
      disX < 0 ? 0 : disX > this.maxOffsetLeft ? this.maxOffsetLeft : disX;
    const boundaryY =
      disY < 0 ? 0 : disY > this.maxOffsetTop ? this.maxOffsetTop : disY;
    if (disX > this.maxOffsetLeft && disY > this.maxOffsetTop) {
      return (this.position = {
        visible: true,
        right: boundaryX,
        bottom: 0,
      });
    } else if (disY > this.maxOffsetTop && disX <= this.maxOffsetLeft) {
      return (this.position = {
        visible: true,
        right: 0,
        bottom: boundaryY,
      });
    } else if (disX > this.maxOffsetLeft && disY <= this.maxOffsetTop) {
      return (this.position = {
        visible: true,
        right: boundaryX,
        bottom: 0,
      });
    }

    if (boundaryX && boundaryY) {
      return (this.position = {
        visible: false,
        right: boundaryX,
        bottom: boundaryY,
      });
    } else {
      return (this.position = {
        visible: true,
        right: boundaryX,
        bottom: boundaryY,
      });
    }
  }
  setAngle() {
    const { right, bottom } = this.position;
    const { y } = this.anchorPoint;
    const relativeCoordinate = {
      x: this.maxOffsetLeft - right + this.leftDistance + 48,
      y: y - bottom,
    };
    function calculateAngleInDegrees(
      point1: { x: number; y: number },
      point2: { x: number; y: number },
    ): number {
      const angleInRadians = Math.atan2(
        point2.y - point1.y,
        point2.x - point1.x,
      );
      const angleInDegrees = angleInRadians * (180 / Math.PI);
      return angleInDegrees;
    }
    this.angle = calculateAngleInDegrees(relativeCoordinate, this.typhoonState);
  }
  getRemainTimeText() {
    const { remainTime } = this.typhoonState;
    if (
      !remainTime ||
      isNaN(remainTime) ||
      !isFinite(remainTime) ||
      remainTime < 0
    ) {
      return '';
    }
    const time = Math.floor(remainTime / 1000);
    const days = Math.floor(time / 86400);
    const hours = Math.floor(time / 3600);
    let minutes: string | number = Math.floor((time - hours * 3600) / 60);
    if (hours && minutes && minutes < 10) {
      minutes = '0' + minutes;
    }
    if (hours > 72) {
      return days + '天';
    }
    if (hours > 48) {
      return hours + '小时';
    }
    return `${hours ? hours + '小时' : ''}${minutes ? minutes + '分钟' : ''}`;
  }
  setRemainTimeText() {
    this.remainTimeText = this.getRemainTimeText();
  }
  update(x: number, y: number, remainTime: number) {
    this.setState(x, y, remainTime);
    this.setPosition();
    this.setAngle();
    this.setRemainTimeText();
  }
  get bottom() {
    return this.position.bottom + this.bottomDistance + 'px';
  }
  get right() {
    return `calc(var(--panel-width) + ${
      this.position.right - this.indicatorRect.width + 24
    }px)`;
  }
  get angleTransform() {
    return `rotate(${this.angle + 90}deg)`;
  }
  get direction() {
    const { bottom, right } = this.position;
    if (!bottom && right) {
      // 在右边
      if (right > this.maxOffsetLeft / 2) {
        return TEXT_DIRECTION.BOTTOM_RIGHT;
      } else {
        return TEXT_DIRECTION.BOTTOM_LEFT;
      }
    }
    if (bottom && !right) {
      // 在底部
      if (bottom > this.maxOffsetTop / 2) {
        return TEXT_DIRECTION.RIGHT_BOTTOM;
      }
    }
    return TEXT_DIRECTION.BOTTOM_LEFT;
  }
}
