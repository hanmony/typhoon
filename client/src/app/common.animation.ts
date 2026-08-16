import {
  animate,
  state,
  style,
  transition,
  trigger,
} from '@angular/animations';

export const horizontalInOut = trigger('horizontalInOut', [
  state('in', style({ transform: 'translate(0, 0%)', opacity: 1 })),
  transition('void => *', [
    style({ opacity: 0, transform: 'translate(60%, 0)' }),
    animate('200ms cubic-bezier(0.35, 0, 0.25, 1)'),
  ]),
  transition('* => void', [
    animate(
      '200ms cubic-bezier(0.35, 0, 0.25, 1)',
      style({ opacity: 0, transform: 'translate(60%, 0)' }),
    ),
  ]),
]);

export const horizontalInOutReverse = trigger('horizontalInOutReverse', [
  state('in', style({ transform: 'translate(0, 0%)', opacity: 1 })),
  transition('void => *', [
    style({ opacity: 0, transform: 'translate(-60%, 0)' }),
    animate('200ms cubic-bezier(0.35, 0, 0.25, 1)'),
  ]),
  transition('* => void', [
    animate(
      '200ms cubic-bezier(0.35, 0, 0.25, 1)',
      style({ opacity: 0, transform: 'translate(-60%, 0)' }),
    ),
  ]),
]);

export const horizontalInOutRelative = trigger('horizontalInOutRelative', [
  state('in', style({ transform: 'translate(0, 0%)', opacity: 1 })),
  transition('void => *', [
    style({ opacity: 0, transform: 'translate(60%, 0)' }),
    animate('200ms cubic-bezier(0.35, 0, 0.25, 1)'),
  ]),
  transition('* => void', [
    animate(
      '200ms cubic-bezier(0.35, 0, 0.25, 1)',
      style({ opacity: 0, transform: 'translate(-60%, 0)' }),
    ),
  ]),
]);

export const verticalInOut = trigger('verticalInOut', [
  state('in', style({ transform: 'translate(0, 0%)', opacity: 1 })),
  transition('void => *', [
    style({ opacity: 0, transform: 'translate(0, 60%)' }),
    animate('200ms cubic-bezier(0.35, 0, 0.25, 1)'),
  ]),
  transition('* => void', [
    animate(
      '200ms cubic-bezier(0.35, 0, 0.25, 1)',
      style({ opacity: 0, transform: 'translate(0, 60%)' }),
    ),
  ]),
]);

export const verticalInOutRelative = trigger('verticalInOutRelative', [
  state('in', style({ transform: 'translate(0, 0%)', opacity: 1 })),
  transition('void => *', [
    style({ opacity: 0, transform: 'translate(0, -60%)' }),
    animate('200ms cubic-bezier(0.35, 0, 0.25, 1)'),
  ]),
  transition('* => void', [
    animate(
      '200ms cubic-bezier(0.35, 0, 0.25, 1)',
      style({ opacity: 0, transform: 'translate(0, -60%)' }),
    ),
  ]),
]);

export const horizontalInOutCenter = trigger('horizontalInOutCenter', [
  state('in', style({ transform: 'translate(0, -50%)', opacity: 1 })),
  transition('void => *', [
    style({ opacity: 0, transform: 'translate(-60%, -50%)' }),
    animate('200ms cubic-bezier(0.35, 0, 0.25, 1)'),
  ]),
  transition('* => void', [
    animate(
      '200ms cubic-bezier(0.35, 0, 0.25, 1)',
      style({ opacity: 0, transform: 'translate(-60%, -50%)' }),
    ),
  ]),
]);

export const scaleInOut = trigger('scaleInOut', [
  state('in', style({ transform: 'scale(1, 1)', opacity: 1 })),
  transition('void => *', [
    style({ opacity: 0, transform: 'scale(0, 0)' }),
    animate('200ms cubic-bezier(0.35, 0, 0.25, 1)'),
  ]),

  transition('* => void', [
    animate(
      '200ms cubic-bezier(0.35, 0, 0.25, 1)',
      style({ opacity: 0, transform: 'scale(0, 0)' }),
    ),
  ]),
]);
