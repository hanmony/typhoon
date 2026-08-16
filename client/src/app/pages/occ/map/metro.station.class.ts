import {
  Circle,
  DivIcon,
  LatLngExpression,
  LeafletEvent,
  Map as LeafletMap,
  Marker,
  circle,
  divIcon,
  marker,
} from 'leaflet';
import 'proj4leaflet';
import { OccEventBusService } from './../occ.event-bus.service';

import { ILineData, ILinePoint } from '../../case-detail/services/meta';
import { getAnimationFrame } from '../../case-detail/utils';
import { OccEventType } from '../occ.event-bus.model';

type MetroStationClickHandler = (me: MetroStation) => void;

export interface MetroStationOptions {
  meta: ILinePoint;
  lineMeta: ILineData;
  eventBus: OccEventBusService;
}

interface IShiningOptions {
  color?: string;
  onClick?: () => void;
}

const defaultColor = '#FFFFF5';

// =====zoom======= [09, 10, 11, 12, 13, 14, 15, 16]
// prettier-ignore
// const radiusMap =   [+0, 0, +0, 150, 100, 55, 40, 20];
const radiusMap =   [+0, 0, +0, 100, 80, 30, 20, 10];
// prettier-ignore
const weightMap =   [+0, +0, +0, 1, +1,  +2, +2, +2];
// prettier-ignore
const fontSizeMap=  [+0, +0, +0, +0, 12, 13, 14, 14];
// prettier-ignore
const iconWidthMap= [+0, +3, +5, +11, 13, 16, 21, 21];

const localStorageRadiusMap = localStorage.getItem('radiusMap');

const globalStationToLineMap = new Map<string, ILineData[]>([]);

export function clearGlobalStationToLineMap() {
  globalStationToLineMap.clear();
}

export class MetroStation {
  eventBus: OccEventBusService;
  protected _mounted = false;
  protected _attached = false;
  protected _map?: LeafletMap;
  protected _stationGroup?: L.LayerGroup;
  id: string;
  _hideName = false;
  hasSameNameMounted: boolean = false; // 是否有同名站点被挂载了
  name: string;
  meta: ILinePoint;
  state: 'normal' | 'abnormal' = 'normal';
  lineMeta: ILineData;
  layer: Circle;
  nameLayer: Marker;
  shiningLayer: Marker;
  shiningColor: string = 'rgba(229, 0, 119, 0.6)';
  stateColor: string = '';
  opacity = 1;
  animationFrameTimer?: number;
  animationFrameFunc = getAnimationFrame();

  clickHandlers: MetroStationClickHandler[] = [];

  addClickHandler(h: MetroStationClickHandler) {
    this.clickHandlers.push(h);
  }
  removeClickHandler(h: MetroStationClickHandler) {
    this.clickHandlers.filter((hs) => hs !== h);
  }
  clearClickHandler() {
    this.clickHandlers = [];
  }

  locateMode = 0;

  constructor({ meta, lineMeta, eventBus }: MetroStationOptions) {
    this.eventBus = eventBus;
    this.id = meta.name || meta.coord.join(',');
    this.name = meta.name || meta.coord.join(',');
    this.meta = meta;
    this.lineMeta = lineMeta;
    this.layer = this.getStationLayer(meta);
    this.nameLayer = this.getNameLayer(meta);
    this.shiningLayer = this.getShiningLayer(meta);
    this.setHasSameNameMounted();
  }
  setLocateMode(type: number) {
    this.locateMode = type;
  }
  removeName() {
    this.nameLayer.remove();
  }
  hideName() {
    this._hideName = true;
    this.nameLayer.remove();
  }
  revertName() {
    this._hideName = false;
    if (!this.hasSameNameMounted) {
      this.nameLayer.addTo(this._stationGroup!);
      this.setName();
    }
  }
  resetName() {
    this.nameLayer = this.getNameLayer(this.meta);
    this.setHasSameNameMounted();
    this.revertName();
  }

  setHasSameNameMounted() {
    const meta = this.meta;
    const lineMeta = this.lineMeta;
    let hasSameNameMounted = false;
    if (globalStationToLineMap.get(meta.name!)) {
      hasSameNameMounted = true;
      globalStationToLineMap.get(meta.name!)?.push(lineMeta);
    } else {
      globalStationToLineMap.set(meta.name!, [lineMeta]);
    }
    this.hasSameNameMounted = hasSameNameMounted;
  }
  getRadius(zoom = 10) {
    const minZoom = 9;
    const actualRadiusMap = localStorageRadiusMap
      ? JSON.parse(localStorageRadiusMap)
      : radiusMap;
    return actualRadiusMap[zoom - minZoom] || 0;
  }
  getWeight(zoom = 10) {
    const minZoom = 9;
    return weightMap[zoom - minZoom] || 0;
  }
  getFontSize(zoom = 10) {
    const minZoom = 9;
    return fontSizeMap[zoom - minZoom] || 0;
  }
  getIconWidth(zoom = 10) {
    const minZoom = 9;
    return iconWidthMap[zoom - minZoom] || 0;
  }
  getStationLayer(meta: ILinePoint, zoom = 10) {
    // const fillColor = this.lineMeta.colorDto.darken(0.4).hex();
    const weight = this.getWeight(zoom);
    const point = circle(meta.coord as LatLngExpression, {
      color: weight ? this.stateColor || defaultColor : 'transparent',
      // fillColor: fillColor,
      fillColor: weight ? this.stateColor || defaultColor : 'transparent',
      fillOpacity: 0.7,
      weight,
      stroke: !!weight,
      radius: this.getRadius(zoom),
    });
    this.addMouseEvents(point, meta);
    return point;
  }
  addMouseEvents(target: Circle | Marker | DivIcon, meta: ILinePoint) {
    target.on('mouseover', (e) => {
      const color = this.stateColor || '#10a4fb';
      this.layer.setStyle({ color, fillColor: color });
      const nameIcon = this.nameLayer.getIcon()!;
      nameIcon.options.className = `text-[${color}]`;
      // nameIcon.style = `color: ${color}`;
      this.nameLayer.setIcon(nameIcon);
    });
    target.on('mouseout', (e) => {
      const color = this.stateColor || defaultColor;
      this.layer.setStyle({ color, fillColor: color });
      const nameIcon = this.nameLayer.getIcon()!;
      nameIcon.options.className = `text-[${defaultColor}]`;
      this.nameLayer.setIcon(nameIcon);
    });

    target.on('click', this.clickCallback.bind(this));
  }
  clickCallback(e: LeafletEvent) {
    if (
      (this.locateMode === 1 || this.locateMode === 2) &&
      this.meta.type === 'station'
    ) {
      this.eventBus.dispatch({
        type: OccEventType.STATION_LOCATE,
        payload: this.meta,
      });
    }
    this.clickHandlers.forEach((h) => h(this));
  }
  getNameIcon(size: number, zoom = 10) {
    let fontSize = this.getFontSize(zoom);
    return divIcon({
      html: `<div class="stroke-text" style="font-size: ${fontSize}px;">${this.name}</div>`,
      // html: meta.name,
      className: 'text-[#e3d3d3]',
      iconSize: [size * fontSize, fontSize],
      iconAnchor: [parseInt((size * fontSize) / 2 + '') || 0, fontSize * 2.1],
    });
  }
  getNameLayer(meta: ILinePoint) {
    const size = (meta.name || '').length;
    return marker(meta.coord as LatLngExpression, {
      icon: this.getNameIcon(size),
    });
  }
  getFlashIcon(meta: ILinePoint, zoom = 10) {
    const width = this.getIconWidth(zoom);
    let shadowWidth = width * 0.75;
    if (zoom > 13) {
      shadowWidth = width * 1.25;
    }
    const div = divIcon({
      html: `
          <div class="block relative rounded-full ${
            width ? 'play-pulse-pro' : ''
          }" style="z-index: -1; width: ${width}px; height: ${width}px; --shadow-width: ${
            width * 0.75
          }px; --shadow-color: ${this.shiningColor};"></div>
        `,
      // html: meta.name,
      className: 'rounded-full',
      iconSize: [width, width],
      iconAnchor: [width / 2, width / 2],
    });
    return div;
  }
  getShiningLayer(meta: ILinePoint, zoom = 10) {
    const m = marker(meta.coord as LatLngExpression, {
      icon: this.getFlashIcon(meta, zoom),
    });
    this.addMouseEvents(m, meta);
    return m;
  }
  onMapZoom(event: LeafletEvent) {
    const size = (this.meta.name || '').length;
    const zoom = this._map!.getZoom();
    if (this._hideName) {
      this.nameLayer.remove();
    } else {
      this.nameLayer.setIcon(this.getNameIcon(size, zoom));
    }
    this.layer.setRadius(this.getRadius(zoom));
    const weight = this.getWeight(zoom);
    this.layer.setStyle({
      color: weight ? this.stateColor || defaultColor : 'transparent',
      fillColor: weight ? this.stateColor || defaultColor : 'transparent',
      weight,
      stroke: !!weight,
    });
    this.shiningLayer.setIcon(this.getFlashIcon(this.meta, zoom));
  }
  setName() {
    const size = (this.meta.name || '').length;
    const zoom = this._map!.getZoom();
    this.nameLayer.setIcon(this.getNameIcon(size, zoom));
  }
  mount(stationGroup: L.LayerGroup, map: LeafletMap) {
    if (!this._map) {
      this._mounted = true;
      this._map = map;
      this._stationGroup = stationGroup;
      this.attachStation();
      this._map.on('zoomend', this.onMapZoom.bind(this));
    }
  }
  unmount() {
    if (this._map) {
      this._mounted = false;
      this.detachStation();
      this._map = undefined;
    }
  }
  attachStation() {
    if (!this._attached) {
      this._attached = true;
      this.layer.addTo(this._stationGroup!);
      // this.shiningLayer && this.shiningLayer.addTo(this._map!);
      //  this.nameLayer.bringToFront();
    }
    if (!this.hasSameNameMounted && !this._hideName) {
      this.nameLayer.addTo(this._stationGroup!);
      this.setName();
    } else {
      this._stationGroup!.removeLayer(this.nameLayer);
    }
  }
  detachStation() {
    if (this._attached) {
      this._attached = false;
      this._stationGroup!.removeLayer(this.layer);
      this._stationGroup!.removeLayer(this.nameLayer);
    }
  }
  followVisibility(visibility: boolean) {
    this.setHasSameNameMounted();
    if (visibility) {
      this.attachStation();
    } else {
      this.detachStation();
    }
  }

  flash() {
    this.bringToFront();
    this.state = 'abnormal';
    this.flashFn();
  }
  private flashFn() {
    if (this.opacity > 0) {
      this.opacity -= 0.02;
    } else {
      this.opacity = 1;
    }
    this.layer.setStyle({
      fillOpacity: this.opacity,
    });
    this.animationFrameTimer = this.animationFrameFunc(this.flash.bind(this));
  }
  stopEffect() {
    this.opacity = 1;
    this.layer.setStyle({
      fillOpacity: this.opacity,
    });
    this.cancelAnimation();
    this.state = 'normal';
  }
  shining(shiningOptions: IShiningOptions = {}) {
    this.shiningColor = shiningOptions.color || 'rgba(229, 0, 119, 1)';
    const zoom = this._map!.getZoom();
    this.shiningLayer.setIcon(this.getFlashIcon(this.meta, zoom));

    this.shiningLayer.on('click', this.clickCallback.bind(this));

    this.shiningLayer.addTo(this._map!);
    this.state = 'abnormal';
  }
  stopShining() {
    this.shiningLayer.off('click');
    this.shiningLayer.remove();
    this.state = 'normal';
  }
  cancelAnimation() {
    if (this.animationFrameTimer) {
      window.cancelAnimationFrame(this.animationFrameTimer);
      this.animationFrameTimer = undefined;
    }
  }
  setStateColor(color: string) {
    this.stateColor = color || defaultColor;
    this.layer.setStyle({
      fillOpacity: 1,
      color: this.stateColor,
      fillColor: this.stateColor,
    });
  }
  bringToFront() {
    this.layer.bringToFront();
    // throw new Error('Method not implemented.');
    this.detachStation();
    setTimeout(() => {
      this.attachStation();
    });
  }
}
