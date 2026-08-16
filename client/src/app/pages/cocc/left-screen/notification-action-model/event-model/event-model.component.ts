import { Component, computed, inject, signal } from '@angular/core';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NZ_MODAL_DATA } from 'ng-zorro-antd/modal';
import { LibraryNzModule } from '../../../../../library.nz.module';
import { getPositionTextFromDto } from '../../../../../shared/shared.event.effect';
import {
  getEventRepairStateColor,
  getEventRepairStateText,
} from '../../../../occ/occ.const';

export interface CoccEventSelectModelData {
  events: ExtremeOcc.Event[];
  lines: string[];
  initialSelected: string[];
  initialLine: string;
  onClose: () => void;
  onChange: (selected: string[]) => void;
}

@Component({
  selector: 'cocc-event-model',
  imports: [LibraryNzModule, NzButtonModule],
  templateUrl: './event-model.component.html',
  styleUrl: './event-model.component.less',
})
export class CoccEventSelectModelComponent {
  readonly nzModalData: CoccEventSelectModelData = inject(NZ_MODAL_DATA);

  get lines() {
    return this.nzModalData.lines;
  }
  get events() {
    return this.nzModalData.events;
  }
  get initialSelected() {
    return this.nzModalData.initialSelected;
  }
  activeLine = signal(this.lines[0]);
  selected = signal<string[]>([]);

  tableEvents = computed(() => {
    const line = this.activeLine();
    return this.events.filter((ev) => ev.line === line);
  });

  ngAfterViewInit() {
    this.selected.set(this.initialSelected);
    this.activeLine.set(this.nzModalData.initialLine);
  }
  closeModel() {
    this.nzModalData.onClose();
  }
  isEventSelected(ev: ExtremeOcc.Event) {
    return this.selected().includes(ev.id);
  }
  handleLinkEvent(ev: ExtremeOcc.Event) {
    this.selected.update((s) => {
      if (s.includes(ev.id)) {
        return s.filter((id) => id !== ev.id);
      }
      return [...s, ev.id];
    });
    this.nzModalData.onChange(this.selected());
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
