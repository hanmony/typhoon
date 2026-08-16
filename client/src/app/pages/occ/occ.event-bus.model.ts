// event-bus.model.ts

import { Position } from '@turf/turf';
import { LatLng } from 'leaflet';
import 'proj4leaflet';
import { AnimationFrame } from '../case-detail/services/classes/typhoon.class';
import { ILinePoint, ITyphoonState } from '../case-detail/services/meta';

export enum OccEventType {
  STATION_LOCATE = 'STATION_LOCATE',
  CUSTOM_LOCATE = 'CUSTOM_LOCATE',
  STATION_CLICK = 'STATION_CLICK',
  QUERY_TO_CONFIRM = 'QUERY_TO_CONFIRM',
  DISABLE_CONFIRM = 'DISABLE_CONFIRM',
  CONFIRM_LOCATE = 'CONFIRM_LOCATE',

  EVENTS_FETCHED = 'EVENTS_FETCHED',
  OPERATIONS_FETCHED = 'OPERATIONS_FETCHED',

  UPDATE_TYPHOON_POSITION = 'UPDATE_TYPHOON_POSITION',
  UPDATE_LANDING_INFO = 'UPDATE_LANDING_INFO',
  READ_IMAGES = 'READ_IMAGES',

  EVENT_EDIT = 'EVENT_EDIT',
  EVENT_UPDATE = 'EVENT_UPDATE',
  EVENT_PARTIAL_UPDATE = 'EVENT_PARTIAL_UPDATE',
  EVENT_TERMINATE = 'EVENT_TERMINATE',
  EVENT_REMOVE = 'EVENT_REMOVE',

  OPERATION_EDIT = 'OPERATION_EDIT',
  OPERATION_UPDATE = 'OPERATION_UPDATE',
  OPERATION_PARTIAL_UPDATE = 'OPERATION_PARTIAL_UPDATE',
  OPERATION_REMOVE = 'OPERATION_REMOVE',

  LINES_CHANGED = 'LINES_CHANGED',

  LINE_MARKER_CLICK = 'LINE_MARKER_CLICK',
}

// 所有事件类型的联合类型
export type OccEvent =
  | { type: OccEventType.STATION_LOCATE; payload: ILinePoint }
  | { type: OccEventType.CUSTOM_LOCATE; payload: LatLng }
  | { type: OccEventType.STATION_CLICK; payload: ILinePoint }
  | { type: OccEventType.EVENTS_FETCHED; payload: ExtremeOcc.Event[] }
  | { type: OccEventType.OPERATIONS_FETCHED; payload: ExtremeOcc.Operation[] }
  | {
      type: OccEventType.UPDATE_TYPHOON_POSITION;
      payload: {
        frame: AnimationFrame;
        previousStates: ITyphoonState[];
        forecastStates: ITyphoonState[];
      };
    }
  | {
      type: OccEventType.UPDATE_LANDING_INFO;
      payload: {
        landingPoint?: Position;
        landingState?: ITyphoonState;
        overlayState?: ITyphoonState;
      };
    }
  | { type: OccEventType.READ_IMAGES; payload: { images: string[] } }
  | { type: OccEventType.EVENT_UPDATE; payload: Partial<ExtremeOcc.Event> }
  | {
      type: OccEventType.EVENT_PARTIAL_UPDATE;
      payload: { id: string } & Partial<ExtremeOcc.Event>;
    }
  | { type: OccEventType.EVENT_EDIT; payload: Partial<ExtremeOcc.Event> }
  | { type: OccEventType.EVENT_REMOVE; payload: ExtremeOcc.Event }
  | {
      type: OccEventType.OPERATION_UPDATE;
      payload: Partial<ExtremeOcc.Operation>;
    }
  | {
      type: OccEventType.OPERATION_EDIT;
      payload: Partial<ExtremeOcc.Operation>;
    }
  | {
      type: OccEventType.OPERATION_PARTIAL_UPDATE;
      payload: { id: string } & Partial<ExtremeOcc.Operation>;
    }
  | { type: OccEventType.OPERATION_REMOVE; payload: ExtremeOcc.Operation }
  | {
      type: OccEventType.LINES_CHANGED;
      payload: {
        lines: string[];
        events: ExtremeOcc.Event[];
        operations: ExtremeOcc.Operation[];
      };
    }
  | { type: OccEventType.LINE_MARKER_CLICK; payload: string }
  | { type: OccEventType; payload: any };
