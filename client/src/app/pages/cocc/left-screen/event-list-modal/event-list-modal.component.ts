import {
  Component,
  input,
  output,
  signal,
  TemplateRef,
  ViewChild,
} from '@angular/core';
import { LibraryNzModule } from './../../../../library.nz.module';
import { OccEventBusService } from './../../../occ/occ.event-bus.service';

import { NzAlertModule } from 'ng-zorro-antd/alert';
import { NzDropDownModule } from 'ng-zorro-antd/dropdown';
import { NzInputModule } from 'ng-zorro-antd/input';
import { NzModalService } from 'ng-zorro-antd/modal';
import { NzSwitchModule } from 'ng-zorro-antd/switch';
import { getPositionTextFromDto } from '../../../../shared/shared.event.effect';
import {
  getEventRepairStateColor,
  getEventRepairStateText,
  repairStateTextMap,
  repairUnits,
  supervisionAssociatedPoints,
} from '../../../occ/occ.const';
import { OccEventType } from '../../../occ/occ.event-bus.model';
import { CoccListShellComponent } from './../list-shell/list-shell.component';

@Component({
  selector: 'cocc-event-list-modal',
  imports: [
    CoccListShellComponent,
    LibraryNzModule,
    NzAlertModule,
    NzDropDownModule,
    NzInputModule,
    NzSwitchModule,
  ],
  templateUrl: './event-list-modal.component.html',
  styleUrl: './event-list-modal.component.less',
})
export class CoccEventListModalComponent {
  @ViewChild('terminateTpl') terminateTpl!: TemplateRef<{}>;
  @ViewChild('repairTpl') repairTpl!: TemplateRef<{}>;
  @ViewChild('supervisionTpl') supervisionTpl!: TemplateRef<{}>;

  visible = signal(false);
  isHide = input<boolean>(false);
  onAdd = output<void>();

  endTime = signal(new Date());

  repairUnits = repairUnits.slice();
  supervisionAssociatedPoints = supervisionAssociatedPoints.slice();
  repairUpdateState = signal<{
    repairUnits: string[];
    responsiblePerson: string;
    contactPhone: string;
  }>({
    repairUnits: [],
    responsiblePerson: '',
    contactPhone: '',
  });

  supervisionUpdateState = signal<{
    supervision: boolean;
    associatedPoint: string;
  }>({
    supervision: false,
    associatedPoint: '',
  });

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
      nzContent: this.terminateTpl,
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

  updateRepairInfo(event: ExtremeOcc.Event) {
    this.repairUpdateState.set({
      repairUnits: event.repairUnits || [],
      responsiblePerson: event.responsiblePerson || '',
      contactPhone: event.contactPhone || '',
    });
    this.createRepairModal(event);
  }
  createRepairModal(event: ExtremeOcc.Event): void {
    this.modal.create({
      nzClassName: 'terminate-modal',
      nzTitle: '抢修信息',
      nzContent: this.repairTpl,
      // nzFooter: tplFooter,
      nzMaskClosable: false,
      nzClosable: false,
      nzOnOk: () => {
        this.occEventBusService.dispatch({
          type: OccEventType.EVENT_PARTIAL_UPDATE,
          payload: {
            id: event.id,
            ...this.repairUpdateState(),
          },
        });
      },
    });
  }

  updateSupervisionInfo(event: ExtremeOcc.Event) {
    this.supervisionUpdateState.set({
      supervision: event.supervision || false,
      associatedPoint: event.associatedPoint || '',
    });
    this.createSupervisionModal(event);
  }

  createSupervisionModal(event: ExtremeOcc.Event): void {
    this.modal.create({
      nzClassName: 'terminate-modal',
      nzTitle: '督办信息',
      nzContent: this.supervisionTpl,
      // nzFooter: tplFooter,
      nzMaskClosable: false,
      nzClosable: false,
      nzOnOk: () => {
        this.occEventBusService.dispatch({
          type: OccEventType.EVENT_PARTIAL_UPDATE,
          payload: {
            id: event.id,
            ...this.supervisionUpdateState(),
          },
        });
      },
    });
  }
}
