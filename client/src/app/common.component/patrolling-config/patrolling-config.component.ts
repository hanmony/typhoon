import { Component, computed, inject, signal } from '@angular/core';
import { NZ_MODAL_DATA } from 'ng-zorro-antd/modal';
import { CommonNzModule } from '../../common.nz.module';
import PatrollingTour from '../../shared/patrolling/patrolling.tour.class';

export interface PatrollingConfigData {
  onConfirm: (p: { speed: number; startTime: Date }) => void;
  onCancel: () => void;
  initData: PatrollingTour;
}

@Component({
  selector: 'app-patrolling-config',
  imports: [CommonNzModule],
  templateUrl: './patrolling-config.component.html',
  styleUrl: './patrolling-config.component.less',
})
export class PatrollingConfigComponent {
  readonly nzModalData: PatrollingConfigData = inject(NZ_MODAL_DATA);

  speed = signal(25);
  startTime = signal<Date | undefined>(undefined);

  get totalDistance() {
    const { totalDistance } = this.nzModalData.initData;
    return Math.floor(totalDistance / 1000);
  }

  consume = computed(() => {
    const speed = this.speed();
    const seconds = this.nzModalData.initData.getEstimateSecond(speed);
    return Math.floor(seconds / 60);
  });

  private _minSpeed = 1;
  private _maxSpeed = 99;

  get speedMinusDisabled() {
    return this.speed() <= this._minSpeed;
  }
  get speedPlusDisabled() {
    return this.speed() >= this._maxSpeed;
  }
  onSpeedMinus() {
    if (!this.speedMinusDisabled) {
      this.speed.update((v) => v - 1);
    }
  }
  onSpeedPlus() {
    if (!this.speedPlusDisabled) {
      this.speed.update((v) => v + 1);
    }
  }
  onSpeedChange(speed: number) {
    if (speed < this._minSpeed) {
      speed = this._minSpeed;
    } else if (speed > this._maxSpeed) {
      speed = this._maxSpeed;
    }
  }

  onConfirm() {
    if (this.confirmDisabled()) return;
    this.nzModalData.onConfirm({
      speed: this.speed(),
      startTime: this.startTime()!,
    });
  }
  onCancel() {
    this.nzModalData.onCancel();
  }

  confirmDisabled = computed(() => {
    if (!this.totalDistance) return true;
    if (!this.speed()) return true;
    return !this.startTime();
  });
}
