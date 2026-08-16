// event-bus.model.ts

import 'proj4leaflet';

export enum DispatchCenterEventType {
  NOOP = 'NOOP',
  TAP = 'TAP',
}

// 所有事件类型的联合类型
export type DispatchCenterEvent =
  | { type: DispatchCenterEventType.NOOP; payload: null }
  | { type: DispatchCenterEventType; payload: any };
