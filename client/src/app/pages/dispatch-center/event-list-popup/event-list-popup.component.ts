import { animate, style, transition, trigger } from '@angular/animations';
import { Component, signal } from '@angular/core';
import { NzToolTipModule } from 'ng-zorro-antd/tooltip';
import { getPositionTextFromDto } from '../../../shared/shared.event.effect';
import {
  getEventRepairStateColor,
  getEventRepairStateText,
} from '../../occ/occ.const';

@Component({
  selector: 'dc-event-list-popup',
  imports: [NzToolTipModule],
  templateUrl: './event-list-popup.component.html',
  styleUrl: './event-list-popup.component.less',
  animations: [
    trigger('popup', [
      transition(':enter', [
        style({ opacity: 0, transform: 'translate(-50%, 30%) scale(0)' }),
        animate(
          '200ms cubic-bezier(0.35, 0, 0.25, 1)',
          style({ opacity: 1, transform: 'translate(-50%, 0) scale(1)' }),
        ),
      ]),
      transition(':leave', [
        animate(
          '200ms cubic-bezier(0.35, 0, 0.25, 1)',
          style({ opacity: 0, transform: 'translate(-50%, 30%) scale(0)' }),
        ),
      ]),
    ]),
  ],
})
export class EventListPopupComponent {
  visible = signal(false);
  isHide = signal(false);
  titleText = signal('');
  closeCallback?: () => void;
  locatingCallback?: (ev: ExtremeOcc.Event) => void;

  onCloseClick() {
    this.closeCallback?.();
  }

  data = signal<ExtremeOcc.Event[]>([]);

  setVisible(visible: boolean) {
    this.visible.set(visible);
  }
  setData(data: ExtremeOcc.Event[]) {
    this.data.set(data);
  }
  setTitleText(titleText: string) {
    this.titleText.set(titleText);
  }

  setCloseCallback(closeCallback: () => void) {
    this.closeCallback = closeCallback;
  }
  setLocatingCallback(locatingCallback?: (ev: ExtremeOcc.Event) => void) {
    this.locatingCallback = locatingCallback;
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
  handleLocating(ev: ExtremeOcc.Event) {
    this.locatingCallback?.(ev);
  }
}
