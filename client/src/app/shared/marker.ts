import {
  divIcon,
  LatLngExpression,
  LeafletMouseEvent,
  marker,
  Marker,
} from 'leaflet';

import 'proj4leaflet';
import {
  getLineArrowMark,
  getLineMark,
} from '../pages/case-detail/services/meta';

type ClickCallback = (e: LeafletMouseEvent) => void;

interface CreateParams {
  position: LatLngExpression;
  scale?: number;
  symbol?: string;
  clickCallback?: ClickCallback;
}

const symbolPrefix = 'assets/images/occ/map/';
// const symbol = symbolPrefix + 'hexagon-maker-event.png';
export const normalPointSymbol = symbolPrefix + 'normal-event-marker.png';
export const repairPointSymbol = symbolPrefix + 'important-event-marker.png';

export function getPointMarkerIcon(
  symbol: string,
  scale = 1,
  animation = true,
) {
  const width = 48;
  const height = 35;
  return divIcon({
    html: `<div class="w-full h-full relative ${animation ? 'animate__animated animate__fadeInDown' : ''}">
       <img src="${symbol}" class="w-full h-full flex items-center justify-center"  />
      </div>`,
    className: 'hover-border',
    // iconSize: [48, 35],
    // iconAnchor: [23, 27],
    iconSize: [width * scale, height * scale],
    iconAnchor: [(width * scale) / 2, height * scale - 5],
  });
}

export function getPointMarker(params: CreateParams) {
  const {
    position,
    scale = 1,
    symbol = normalPointSymbol,
    clickCallback = () => {},
  } = params;

  const m = marker(position as LatLngExpression, {
    icon: getPointMarkerIcon(symbol, scale),
    riseOnHover: true,
    zIndexOffset: 1,
  }) as Marker;
  m.on('click', (p) => {
    clickCallback(p);
  });
  return m;
}

export const yellowToolSymbol =
  'assets/images/dispatch-center/map/hexagon-tool-yellow.png';
export const blueToolSymbol =
  'assets/images/dispatch-center/map/hexagon-tool-blue.png';

export function getToolMarkerIcon(symbol: string, scale = 1, animation = true) {
  const width = 68;
  const height = 105;
  return divIcon({
    html: `<img src="${symbol}" class="w-full h-full motion-reduce:animate-bounce ${animation ? 'animate__animated animate__fadeInDown' : ''}" />`,
    className: 'hover-border',
    // iconSize: [68, 105],
    // iconAnchor: [34, 105],
    iconSize: [width * scale, height * scale],
    iconAnchor: [(width * scale) / 2, height * scale - 1],
  });
}

export function getToolMarker(params: CreateParams) {
  const {
    position,
    scale = 1,
    symbol = yellowToolSymbol,
    clickCallback = () => {},
  } = params;
  const m = marker(position as LatLngExpression, {
    icon: getToolMarkerIcon(symbol, scale),
    riseOnHover: true,
    zIndexOffset: 1,
  }) as Marker;
  m.on('click', (p) => {
    // this.toggleDetailPopUpBox(event);
    clickCallback(p);
  });
  return m;
}

export function getShiningPointMarkerIcon(scale = 1, color: string) {
  const width = 25;
  const height = 25;
  return divIcon({
    html: `<div
    class="block w-full h-full rounded-full play-pulse ml-4"
    style="--shadow-width: ${(width / 2.5) * scale}px"
    [style.--shadow-color]="${color}"
  ></div>`,
    className: 'hover-border',
    // iconSize: [68, 105],
    // iconAnchor: [34, 105],
    iconSize: [width * scale, height * scale],
    iconAnchor: [(width * scale) / 2, (height * scale) / 2],
  });
}

export function getShiningPointMarker(params: CreateParams, color: string) {
  const { position, scale = 1, clickCallback = () => {} } = params;
  const m = marker(position as LatLngExpression, {
    icon: getShiningPointMarkerIcon(scale, color),
    riseOnHover: true,
    zIndexOffset: 1,
  }) as Marker;
  m.on('click', (p) => {
    // this.toggleDetailPopUpBox(event);
    clickCallback(p);
  });
  return m;
}

export const lineEventsSymbol =
  'assets/images/dispatch-center/map/line-event-marker.png';
export const lineEventsBoxSymbol =
  'assets/images/dispatch-center/map/line-event-marker-box.png';

interface DispatchCenterLineMarkerData {
  line: string;
  15: number;
  30: number;
}

export function getDispatchCenterLineIcon(
  data: DispatchCenterLineMarkerData,
  scale = 1,
) {
  if (scale === 0) {
    return divIcon({
      html: ``,
      iconSize: [0, 0],
    });
  }
  const width = 213;
  const height = 108;
  const boxHeight = height + 34;
  // const marginBottom = height * 0.14;
  const symbol = lineEventsSymbol;
  //<div>重点事件： ${number[0]}</div>
  // <div>普通事件： ${number[1]}</div>
  const getFieldLabel = (label: string) => {
    return `<div class="inline-block h-4 leading-4 pr-2 pl-2" style="font-size:${15 * scale}px; background: linear-gradient(to right, #00FFFFcc, #00FFFF00, #00FFFF00);">${label}</div>`;
  };
  return divIcon({
    html: `
        <div class="relative">
          <img scale=${scale} style="width: ${width * scale}px;" src="${lineEventsBoxSymbol}" />
          <div class="w-full h-full text-nowrap whitespace-nowrap absolute left-1/2 top-1/2 transform -translate-x-1/2 -translate-y-1/2" style="font-size: ${16 * scale}px">
            <div class="font-pangmen flex justify-between items-center" style="height: 32%; padding-left: 20%; padding-right: 10%;padding-top: 4%;">
              <div>${data.line}</div>
              <div>影响运营</div>
            </div>
            <div class="flex justify-between text-center" style="padding: 0 6%;">
              <div class="w-1/2">
                <div style="color: #06E1E1; font-size: ${24 * scale}px">${data[15]}</div>
                ${getFieldLabel('15分钟以上')}
              </div>
              <div class="w-1/2">
                <div style="color: #06E1E1; font-size: ${24 * scale}px">${data[30]}</div>
                ${getFieldLabel('30分钟以上')}
              </div>
            </div>
          </div>
        </div>

      <div class="text-center">
        <img style="width: 40px; height: 34px" src="${symbol}" />
      </div>
    `,
    className: 'hover-border',
    // iconSize: [68, 105],
    // iconAnchor: [34, 105],
    iconSize: [width * scale, boxHeight * scale],
    iconAnchor: [(width * scale) / 2, boxHeight * scale],
  });
}

export function getSupervisorLineIcon(lineName: string, scale = 1) {
  if (scale === 0) {
    return divIcon({
      html: ``,
      iconSize: [0, 0],
    });
  }
  const width = 120;
  const height = 130;

  const lineLogo = getLineMark(lineName);
  const lineArrow = getLineArrowMark(lineName);

  return divIcon({
    html: `
       <div class="relative">
          <div class="absolute line-marker left-0 w-full text-center" style="bottom: 63%">
            <img scale=${scale} style="width: ${width * 0.5 * scale}px;" src="${lineLogo}" />
          </div>
          <div>
            <img scale=${scale} style="width: ${width * scale}px;" src="${lineArrow}" />
          </div>
        </div>
    `,
    className: 'active-effect',
    // iconSize: [68, 105],
    // iconAnchor: [34, 105],
    iconSize: [width * scale, height * scale],
    iconAnchor: [(width * scale) / 2, 0.55 * height * scale],
  });
}

export function getDispatchCenterLineMarker(
  params: CreateParams,
  data: DispatchCenterLineMarkerData,
) {
  const { position, scale = 1, clickCallback = () => {} } = params;
  const m = marker(position as LatLngExpression, {
    icon: getDispatchCenterLineIcon(data, scale),
    riseOnHover: true,
    zIndexOffset: 1,
  }) as Marker;
  m.on('click', (p) => {
    // this.toggleDetailPopUpBox(event);
    clickCallback(p);
  });
  return m;
}

export interface DispatchCenterStationIconParams {
  // number: number[];
  ev: ExtremeOcc.Event;
  scale?: number;
}

export const stationEventSymbol =
  'assets/images/dispatch-center/map/station-event-marker.png';
export const stationEventSeveritySymbol =
  'assets/images/dispatch-center/map/station-event-severity-marker.png';

export const STATION_EVENT_TYPE_ICON_MAP = {
  树枝侵限: ['encroachment', 140, 20],
  异物侵限: ['encroachment', 140, 20],
  设备故障: ['equipment', 80, 60],
  渗漏水: ['water', 80, 50],
  积水: ['water', 80, 50],
  基地事件: ['base', 110, 10],
  列车故障: ['failure', 120, 40],
  其他事件: ['other', 80, 60],
};

export function getStationEventTypeIcon(type: string, severity: boolean) {
  const [key, width, top] = STATION_EVENT_TYPE_ICON_MAP[type] || 'other';
  return [
    `assets/images/dispatch-center/map/event-icon/${severity ? 'severity' : 'normal'}-${key}.png`,
    width,
    top,
  ];
}

export const STATION_EVENT_REPAIR_ICON_MAP = {
  0: 'assets/images/dispatch-center/map/event-icon/repair-pending.png',
  1: 'assets/images/dispatch-center/map/event-icon/repair-doing.png',
  2: 'assets/images/dispatch-center/map/event-icon/repair-done.png',
};

export function getDispatchCenterStationIcon(
  p: DispatchCenterStationIconParams,
) {
  const { ev, scale = 1 } = p;
  const { severity } = ev;
  if (scale === 0) {
    return divIcon({
      html: ``,
      iconSize: [0, 0],
    });
  }
  const width = 360;
  const height = 360;

  // const hueRotateStyleItem = severity ? ' filter: hue-rotate(150deg)' : '';
  const symbol = severity ? stationEventSeveritySymbol : stationEventSymbol;
  const [eventTypeIcon, iconWidth, iconTop] = getStationEventTypeIcon(
    ev.eventType,
    !!severity,
  );
  const repairIcon = ev.urgentRepair
    ? STATION_EVENT_REPAIR_ICON_MAP[ev.urgentRepairStatus]
    : '';

  const repairIconDom = repairIcon
    ? `<img class="absolute z-10" style="width: ${48 * scale}px; right: 23%; bottom: 75%;" data-scale=${scale} src="${repairIcon}" />
`
    : '';
  return divIcon({
    html: `<div class="relative">
      <div class="absolute w-full flex items-center justify-center" style="top: ${iconTop * scale}px; z-index: 1">
          <img style="width: ${iconWidth * scale}px;" data-scale=${scale} src="${eventTypeIcon}" />
      </div>
      ${repairIconDom}
      <div>
        <img style="width: ${width * scale}px; height: ${height * scale}px;" src="${symbol}" />
      </div>
    </div>
    `,
    className: 'hover-border',
    // iconSize: [68, 105],
    // iconAnchor: [34, 105],
    iconSize: [width * scale, height * scale],
    iconAnchor: [(width * scale) / 2, height * scale * 0.84],
  });
}

export function getDispatchCenterStationMarker(
  params: CreateParams,
  p: DispatchCenterStationIconParams,
) {
  const { position, scale = 1, clickCallback = () => {} } = params;
  const m = marker(position as LatLngExpression, {
    icon: getDispatchCenterStationIcon(p),
    riseOnHover: true,
    zIndexOffset: 1,
  }) as Marker;
  m.on('click', (p) => {
    // this.toggleDetailPopUpBox(event);
    clickCallback(p);
  });
  return m;
}
