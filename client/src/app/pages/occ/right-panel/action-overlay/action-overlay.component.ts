import {
  animate,
  state,
  style,
  transition,
  trigger,
} from '@angular/animations';
import { Component, computed, input, output } from '@angular/core';
import { verticalInOut } from '../../../../common.animation';
import { actions, operationSubActions } from '../../occ.const';

@Component({
  selector: 'occ-action-overlay',
  imports: [],
  templateUrl: './action-overlay.component.html',
  styleUrl: './action-overlay.component.less',
  animations: [
    verticalInOut,
    trigger('zoomInOut', [
      state(
        'in',
        style({ transform: 'translate(0, 0%) scale(1)', opacity: 1 }),
      ),
      transition('void => *', [
        style({ opacity: 0, transform: 'translate(0, 35%) scale(0)' }),
        animate('200ms cubic-bezier(0.35, 0, 0.25, 1)'),
      ]),
      transition('* => void', [
        animate(
          '200ms cubic-bezier(0.35, 0, 0.25, 1)',
          style({ opacity: 0, transform: 'translate(0, 35%) scale(0)' }),
        ),
      ]),
    ]),
  ],
})
export class OccActionOverlayComponent {
  isHide = input<boolean>(false);
  actions = input<{ name: string; key: string }[]>(actions);
  operationSubActions =
    input<{ name: string; key: string }[]>(operationSubActions);
  activeAction = input<string | null>(null);

  actionChange = output<string>();
  onSubAction = output<string>();

  isOperationAction = computed(() => {
    return this.activeAction() === 'operation-adjustment';
  });

  handleAction(key: string) {
    this.actionChange.emit(key);
  }

  handleSubAction(key: string) {
    this.onSubAction.emit(key);
  }
}
