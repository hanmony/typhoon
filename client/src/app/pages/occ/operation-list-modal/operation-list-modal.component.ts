import {
  Component,
  input,
  signal,
  TemplateRef,
  ViewChild,
} from '@angular/core';
import dayjs from 'dayjs';
import { NzAlertModule } from 'ng-zorro-antd/alert';
import { NzMessageService } from 'ng-zorro-antd/message';
import { NzModalService } from 'ng-zorro-antd/modal';
import { getPositionTextFromDto } from '../../../shared/shared.event.effect';
import { OccEventType } from '../occ.event-bus.model';
import { OccEventBusService } from '../occ.event-bus.service';
import { LibraryNzModule } from './../../../library.nz.module';
import { OccListShellComponent } from './../list-shell/list-shell.component';

@Component({
  selector: 'occ-operation-list-modal',
  imports: [OccListShellComponent, LibraryNzModule, NzAlertModule],
  templateUrl: './operation-list-modal.component.html',
  styleUrl: './operation-list-modal.component.less',
})
export class OccOperationListModalComponent {
  @ViewChild('tplContent') tplContent!: TemplateRef<HTMLDivElement>;
  visible = signal(false);
  isHide = input<boolean>(false);

  actualEndTime = signal(new Date());
  constructor(
    private occEventBusService: OccEventBusService,
    private modal: NzModalService,
    private message: NzMessageService,
  ) {}
  toggleVisible() {
    this.visible.update((prev) => !prev);
  }

  close() {
    this.visible.set(false);
  }
  open() {
    this.visible.set(true);
  }

  data = input<ExtremeOcc.Operation[]>([]);

  getOperationPosition(op: ExtremeOcc.Operation) {
    return getPositionTextFromDto(op);
  }
  getOperationEndTime(op: ExtremeOcc.Operation) {
    if (op.isEndTimeOptional) {
      if (op.actualEndTime) {
        return dayjs(op.actualEndTime).format('MM/DD HH:mm');
      }
      return '待定';
    }
    return dayjs(op.endTime).format('MM/DD HH:mm');
  }
  isTerminated(op: ExtremeOcc.Operation) {
    if (!op.actualEndTime) return false;
    return new Date(op.endTime).getTime() < new Date().getTime();
  }
  toggleOperationVisible(op: ExtremeOcc.Operation) {
    op.isShow = !op.isShow;
    this.occEventBusService.dispatch({
      type: OccEventType.OPERATION_UPDATE,
      payload: {
        ...op,
      },
    });
  }

  editOperation(op: ExtremeOcc.Operation) {
    this.occEventBusService.dispatch({
      type: OccEventType.OPERATION_EDIT,
      payload: {
        ...op,
      },
    });
  }
  removeOperation(op: ExtremeOcc.Operation) {
    this.occEventBusService.dispatch({
      type: OccEventType.OPERATION_REMOVE,
      payload: { ...op },
    });
  }

  editActualEndTime(op: ExtremeOcc.Operation) {
    this.createTerminateModal(op);
  }
  createTerminateModal(op: ExtremeOcc.Operation): void {
    this.actualEndTime.set(
      op.actualEndTime ? new Date(op.actualEndTime) : new Date(),
    );
    this.modal.create({
      nzClassName: 'terminate-modal',
      nzTitle: '运营恢复',
      nzContent: this.tplContent,
      // nzFooter: tplFooter,
      nzMaskClosable: false,
      nzClosable: false,
      nzOnOk: async () => {
        if (this.actualEndTime().getTime() < new Date(op.startTime).getTime()) {
          this.message.error('实际运营恢复时间不能早于计划开始时间');
          return Promise.reject();
        }
        if (this.actualEndTime().getTime() > new Date().getTime()) {
          this.message.error('实际运营恢复时间不能晚于当前时间');
          return Promise.reject();
        }
        return this.updateActualTime(op.id, this.actualEndTime().toISOString());
      },
    });
  }

  async updateActualTime(id: string, actualEndTime: string) {
    this.occEventBusService.dispatch({
      type: OccEventType.OPERATION_PARTIAL_UPDATE,
      payload: {
        id: id,
        actualEndTime,
      },
    });
  }
}
