import { Injectable } from '@angular/core';
import { ActionCategory } from '../../../domain/action.category';
import { ActionDto } from '../../../domain/action.dto';
import { KeyEventModalComponent } from '../key-event-modal/key-event-modal.component';
import { UtilsService } from './utils.service';

export enum KeyEventType {
  report = '分析报告',
  popup = '弹窗',
}

export interface FormattedKeyEventDto {
  startTime: Date;
  endTime: Date | null;
  eventName: string;
  type: KeyEventType;
  description: string;
  rawEvent: ActionDto;
}
export function formatKeyEvent(
  ev: ActionDto,
  utils: UtilsService,
): FormattedKeyEventDto {
  const items = ev.items;
  return {
    startTime: new Date(utils.formatTimeString(ev.fromDate)),
    endTime: new Date(utils.formatTimeString(ev.toDate)),
    eventName: items['事件名称'] || '',
    type: (items['类型'] as KeyEventType) || KeyEventType.popup,
    description: items['描述'] || '',
    rawEvent: ev,
  };
}

@Injectable({
  providedIn: 'root',
})
export class KeyEventReactService {
  protected _modal?: KeyEventModalComponent;
  constructor(private readonly utils: UtilsService) {}
  registerModal(modal: KeyEventModalComponent) {
    this._modal = modal;
  }

  reactKeyEvent(ev: ActionDto) {
    if (ev.category !== ActionCategory.keynote) return;
    const formattedDto = formatKeyEvent(ev, this.utils);

    this._modal?.show(formattedDto);
  }
  react(evs: ActionDto[]) {
    evs.forEach((ev) => {
      this.reactKeyEvent(ev);
    });
  }
  clearReaction() {
    this._modal?.clear();
  }
}
