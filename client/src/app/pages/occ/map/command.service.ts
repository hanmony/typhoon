import { Injectable } from '@angular/core';
import dayjs from 'dayjs';
import { NzMessageService } from 'ng-zorro-antd/message';
import { Subject } from 'rxjs';
import { getDummyTyphoonSteps } from '../../../../dummy/typhoon.source';
import { ApiService } from '../../../services/api.service';
import { SocketService } from '../../../services/socket.service';

export const emergencyResponseDegreeOptions = [
  {
    label: 'Ⅰ级',
    value: 'Ⅰ',
  },
  {
    label: 'Ⅱ级',
    value: 'Ⅱ',
  },
  {
    label: 'Ⅲ级',
    value: 'Ⅲ',
  },
  {
    label: 'Ⅳ级',
    value: 'Ⅳ',
  },
];

@Injectable({
  providedIn: 'root',
})
export class CommandService {
  command!: ExtremeCommand.InfoItem;
  commandSetupSubject$ = new Subject<ExtremeCommand.InfoItem>();

  /** 台风模拟演练阶段时间点集合 */
  steps: string[] = [];

  constructor(
    private api: ApiService,
    private message: NzMessageService,
    private socketService: SocketService,
  ) {
    this.socketService.on('notification').subscribe(async (type) => {
      // this.setCommand(command);
      if (type === 'updateEmergencyResponse') {
        await this.validateCommandPlatform();
      }
      if (type === 'updateSimulateStartTime') {
        await this.validateCommandPlatform();
        this.afterUpdateSimulateStartTime();
      }
    });
  }

  setCommand(command: ExtremeCommand.InfoItem) {
    this.command = command;
    this.setSteps();
    this.commandSetupSubject$.next(command);
  }

  setSteps() {
    if (this.command.isSimulated) {
      this.steps = getDummyTyphoonSteps(this.command.name) || [];
    }
  }

  validateCommandPlatform() {
    return new Promise((resolve, reject) => {
      this.api.extreme.validateCommandPlatform().then((res) => {
        if (res && Array.isArray(res)) {
          if (!res.length) {
            resolve(null);
          } else {
            const [command] = res;
            this.setCommand(command);
            resolve(command);
          }
        } else {
          reject('指挥台检测失败');
        }
      });
    });
  }

  async updateEmergencyResponse(
    params: Pick<
      ExtremeCommand.InfoItem,
      'municipalDegree' | 'corporateDegree' | 'municipalFlag' | 'corporateFlag'
    >,
  ) {
    await this.api.extreme.updateEmergencyResponse(params);
  }
  async simulateNextStep() {
    const nextStep = this.nextSimulateStep;
    await this.api.extreme.updateSimulateStartTime(nextStep);
  }

  getCommandDuration() {
    return Date.now() - dayjs(this.command.startTime).valueOf();
  }

  afterUpdateSimulateStartTime() {
    this.message.info('即将重载页面进入下个阶段');
    setTimeout(() => {
      window.location.reload();
    }, 3000);
  }

  get simulateCurrentTime() {
    return dayjs(this.command.simulateStartTime).add(this.getCommandDuration());
  }
  get nextSimulateStep() {
    const current = this.simulateCurrentTime.format('YYYY-MM-DD HH:mm:ss');
    const next = this.steps.find((step) => step > current);
    return next || '';
  }
}
