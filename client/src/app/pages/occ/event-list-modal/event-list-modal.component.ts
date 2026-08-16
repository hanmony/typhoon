import {
  Component,
  input,
  signal,
  TemplateRef,
  ViewChild,
} from '@angular/core';
import { NzAlertModule } from 'ng-zorro-antd/alert';
import { NzDropDownModule } from 'ng-zorro-antd/dropdown';
import { NzModalService } from 'ng-zorro-antd/modal';
import { getPositionTextFromDto } from '../../../shared/shared.event.effect';
import {
  getEventRepairStateColor,
  getEventRepairStateText,
} from '../occ.const';
import { OccEventType } from '../occ.event-bus.model';
import { LibraryNzModule } from './../../../library.nz.module';
import { OccListShellComponent } from './../list-shell/list-shell.component';
import { repairStateTextMap } from './../occ.const';
import { OccEventBusService } from './../occ.event-bus.service';

@Component({
  selector: 'occ-event-list-modal',
  imports: [
    OccListShellComponent,
    LibraryNzModule,
    NzAlertModule,
    NzDropDownModule,
  ],
  templateUrl: './event-list-modal.component.html',
  styleUrl: './event-list-modal.component.less',
})
export class OccEventListModalComponent {
  @ViewChild('tplContent') tplContent!: TemplateRef<{}>;

  visible = signal(false);
  isHide = input<boolean>(false);

  endTime = signal(new Date());

  repairOptions = Object.entries(repairStateTextMap).map(([value, label]) => ({
    value: Number(value),
    label,
  }));

  constructor(
    private occEventBusService: OccEventBusService,
    private modal: NzModalService,
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

  data = input<ExtremeOcc.Event[]>([]);

  getEventPosition(event: ExtremeOcc.Event) {
    return getPositionTextFromDto(event);
  }
  getEventRepairStateText(event: ExtremeOcc.Event) {
    return getEventRepairStateText(event);
  }
  getEventRepairStateColor(event: ExtremeOcc.Event) {
    return getEventRepairStateColor(event);
  }

  toggleEventVisible(event: ExtremeOcc.Event) {
    event.isShow = !event.isShow;
    this.occEventBusService.dispatch({
      type: OccEventType.EVENT_UPDATE,
      payload: {
        ...event,
      },
    });
  }

  editEvent(event: ExtremeOcc.Event) {
    this.occEventBusService.dispatch({
      type: OccEventType.EVENT_EDIT,
      payload: {
        ...event,
      },
    });
  }

  updateRepairState(event: ExtremeOcc.Event, state: number) {
    this.occEventBusService.dispatch({
      type: OccEventType.EVENT_UPDATE,
      payload: {
        ...event,
        urgentRepairStatus: state,
      },
    });
  }

  removeEvent(event: ExtremeOcc.Event) {
    this.occEventBusService.dispatch({
      type: OccEventType.EVENT_REMOVE,
      payload: { ...event },
    });
  }

  createTerminateModal(event: ExtremeOcc.Event): void {
    this.modal.create({
      nzClassName: 'terminate-modal',
      nzTitle: '确定结束事件吗？',
      nzContent: this.tplContent,
      // nzFooter: tplFooter,
      nzMaskClosable: false,
      nzClosable: false,
      nzOnOk: () => {
        this.occEventBusService.dispatch({
          type: OccEventType.EVENT_TERMINATE,
          payload: {
            ...event,
            urgentRepairStatus: event.urgentRepair ? 2 : 0,
            endTime: this.endTime().toISOString(),
            terminated: 1,
          },
        });
      },
    });
  }

  terminateEvent(event: ExtremeOcc.Event) {
    this.endTime.set(event.terminated ? new Date(event.endTime) : new Date());
    this.createTerminateModal(event);
  }
}
