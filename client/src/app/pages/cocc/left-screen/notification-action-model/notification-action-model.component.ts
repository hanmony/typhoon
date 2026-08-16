import { Component, computed, input, signal } from '@angular/core';
import { NzMessageService } from 'ng-zorro-antd/message';
import { NzModalRef, NzModalService } from 'ng-zorro-antd/modal';
import { LibraryNzModule } from '../../../../library.nz.module';
import { ApiService } from '../../../../services/api.service';
import { getPositionTextFromDto } from '../../../../shared/shared.event.effect';
import { getLineMark, linesData2026 } from '../../../case-detail/services/meta';
import {
  getEventRepairStateColor,
  getEventRepairStateText,
} from '../../../occ/occ.const';
import { OccModalSelectComponent } from '../../../occ/widget/select/select.component';
import { OccModalTextareaComponent } from '../../../occ/widget/textarea/textarea.component';
import {
  CoccEventSelectModelComponent,
  CoccEventSelectModelData,
} from './event-model/event-model.component';

const initialValues: {
  type: string;
  content: string;
  lines: string[];
  events: string[];
} = {
  type: '重点事件',
  content: '',
  lines: [],
  events: [],
};

@Component({
  selector: 'cocc-notification-action-model',
  imports: [
    LibraryNzModule,
    OccModalSelectComponent,
    OccModalTextareaComponent,
  ],
  templateUrl: './notification-action-model.component.html',
  styleUrl: './notification-action-model.component.less',
})
export class CoccNotificationActionModelComponent {
  eventSelectModal?: NzModalRef<
    CoccEventSelectModelComponent,
    CoccEventSelectModelData
  >;
  events = input<ExtremeOcc.Event[]>([]);
  lines = linesData2026.map((l) => l.name);
  typeOptions = ['重点事件', '重要运营调整', '重要通告', '运营恢复', '其他'];
  _lineOptions = computed(() => {
    const values = this.values();
    if (['重要通告', '运营恢复'].includes(values.type)) {
      return ['全线网', ...this.lines];
    }
    return this.lines;
  });
  get lineOptions() {
    return this._lineOptions();
  }
  values = signal(initialValues);

  isEventType = computed(() => this.values().type === '重点事件');

  selectedEvents = computed(() => {
    const values = this.values();
    const allEvents = this.events();
    const selectedEvents = allEvents.filter((ev) =>
      values.events.includes(ev.id),
    );
    return [
      ...values.lines.map((l) => selectedEvents.filter((ev) => ev.line === l)),
    ]
      .flat()
      .filter(Boolean) as ExtremeOcc.Event[];
  });

  constructor(
    private modal: NzModalService,
    private api: ApiService,
    private message: NzMessageService,
  ) {}
  setType(type: string | string[]) {
    this.values.update((prev) => ({
      ...prev,
      type: type as string,
      lines: [],
      events: [],
    }));
  }
  setContent(content: string) {
    this.values.update((prev) => ({ ...prev, content: content }));
  }
  setLines(lines: string[]) {
    if (lines[lines.length - 1] === '全线网') {
      this.values.update((prev) => ({ ...prev, lines: ['全线网'] }));
      return;
    }
    if (lines.includes('全线网')) {
      lines = (lines as string[]).filter((l) => l !== '全线网');
      this.values.update((prev) => ({ ...prev, lines: lines }));
      return;
    }
    if (lines.length > 3) {
      this.message.warning('最多选择3条线路');
    }
    lines = lines.slice(0, 3);
    this.values.update((prev) => ({
      ...prev,
      lines: lines,
      events: prev.events.filter((evId) => {
        const ev = this.events().find((ev) => ev.id === evId)!;
        return lines.includes(ev.line);
      }),
    }));
  }
  onEventSelectChange(selected: string[]) {
    this.values.update((prev) => ({ ...prev, events: selected }));
  }
  createEventSelectModal(line?: string) {
    this.eventSelectModal = this.modal.create<
      CoccEventSelectModelComponent,
      CoccEventSelectModelData
    >({
      nzClassName: 'event-select-modal',
      nzContent: CoccEventSelectModelComponent,
      nzClosable: false,
      nzData: {
        events: this.events(),
        lines: this.values().lines.slice(),
        initialSelected: this.values().events.slice(),
        initialLine: line || this.values().lines[0],
        onClose: this.closeEventSelectModal.bind(this),
        onChange: this.onEventSelectChange.bind(this),
      },
      // nzWidth: '94vw',
      nzKeyboard: false,
      nzWidth: 'calc(770px + 96px)',
      nzMaskClosable: false,
      nzMaskStyle: {
        backgroundColor: 'rgba(0, 0, 0, 0.1)',
      },
      nzCentered: true,
      nzFooter: null,
    });
  }
  closeEventSelectModal() {
    this.eventSelectModal?.close();
    this.eventSelectModal?.destroy();
    this.eventSelectModal = undefined;
  }
  onEventSelect(line?: string) {
    if (!this.values().lines.length) return;
    this.createEventSelectModal(line);
  }

  async onSubmit() {
    const values = this.values();
    await this.api.extreme.addNotification({
      title: '',
      content: values.content || '',
      type: values.type,
      lines: values.lines,
      eventIds: values.events,
    });
  }

  getLineMark(lineName: string) {
    return getLineMark(lineName);
  }
  getEventPosition(event: ExtremeOcc.Event) {
    return getPositionTextFromDto(event);
  }
  getEventRepairStateText(event: ExtremeOcc.Event) {
    return getEventRepairStateText(event);
  }
  getEventRepairStateColor(event: ExtremeOcc.Event) {
    return getEventRepairStateColor(event);
  }
}
