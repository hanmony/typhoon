import { Component, computed, input, output, signal } from '@angular/core';
import dayjs from 'dayjs';
import { LibraryNzModule } from '../../../../../library.nz.module';
import { getPositionTextFromDto } from '../../../../../shared/shared.event.effect';
import { getLineMark } from '../../../../case-detail/services/meta';
import {
  getEventEffectDurationText,
  getEventRepairStateColor,
  getEventRepairStateText,
} from '../../../../occ/occ.const';

@Component({
  selector: 'cocc-notification-detail',
  imports: [LibraryNzModule],
  templateUrl: './notification-detail.component.html',
  styleUrl: './notification-detail.component.less',
})
export class NotificationDetailComponent {
  onClose = output<void>();
  onLocate = output<ExtremeOcc.Event>();
  events = input<ExtremeOcc.Event[]>([]);
  data = input.required<Extreme.Notification>();
  currentLine = signal<string>('1号线');
  currentLineMark = computed(() => {
    return this.getLineMark(this.currentLine());
  });
  publishTime = computed(() => {
    return dayjs(this.data().createTime).format('MM/DD HH:mm');
  });
  currentLineEvents = computed(() => {
    const line = this.currentLine();
    const eventIds = this.data().eventIds;
    const allEvents = this.events();
    return allEvents.filter(
      (ev) => ev.line === line && eventIds.includes(ev.id),
    );
  });
  ngOnInit() {
    this.currentLine.set(this.data().lines[0]);
  }
  handleNext() {
    const currentLineIndex = this.data().lines.indexOf(this.currentLine());
    const nextLineIndex = currentLineIndex + 1;
    if (nextLineIndex >= this.data().lines.length) {
      this.currentLine.set(this.data().lines[0]);
      return;
    }
    this.currentLine.set(this.data().lines[nextLineIndex]);
  }
  handleCollapse() {
    this.onClose.emit();
  }
  handleLocate(ev: ExtremeOcc.Event) {
    this.onLocate.emit(ev);
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
  getEventEffectDurationText(event: ExtremeOcc.Event) {
    return getEventEffectDurationText(event);
  }
}
