// event-bus.model.ts

import 'proj4leaflet';

export enum CoccEventType {}

// 所有事件类型的联合类型
export type CoccEvent = { type: CoccEventType; payload: any };
