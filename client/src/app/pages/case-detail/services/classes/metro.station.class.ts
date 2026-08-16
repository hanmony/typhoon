import {
  Circle,
  LatLngExpression,
  LeafletEvent,
  Map as LeafletMap,
  Marker,
  circle,
  divIcon,
  marker,
} from 'leaflet';
import 'proj4leaflet';
import { getAnimationFrame } from '../../utils';
import { ILineData, ILinePoint } from '../meta';

export interface MetroStationOptions {
  meta: ILinePoint;
  lineMeta: ILineData;
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
  protected _mounted = false;
  protected _attached = false;
  protected _map?: LeafletMap;
  protected _stationGroup?: L.LayerGroup;
  id: string;
  hasSameNameMounted: boolean = false; // 是否有同名站点被挂载了
  name: string;
  meta: ILinePoint;
  state: 'normal' | 'abnormal' = 'normal';
  lineMeta: ILineData;
  layer: Circle;
  nameLayer: Marker;
  shiningLayer: Marker;
  shiningColor: string = 'rgba(229, 0, 119, 0.6)';
  opacity = 1;
  animationFrameTimer?: number;
  animationFrameFunc = getAnimationFrame();

  constructor({ meta, lineMeta }: MetroStationOptions) {
    this.id = meta.name || meta.coord.join(',');
    this.name = meta.name || meta.coord.join(',');
    this.meta = meta;
    this.lineMeta = lineMeta;
    this.layer = this.getStationLayer(meta);
    this.nameLayer = this.getNameLayer(meta);
    this.shiningLayer = this.getShiningLayer(meta);
    this.setHasSameNameMounted({ meta, lineMeta });
  }

  setHasSameNameMounted({ meta, lineMeta }: MetroStationOptions) {
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
      color: weight ? defaultColor : 'transparent',
      // fillColor: fillColor,
      fillColor: weight ? defaultColor : 'transparent',
      fillOpacity: 0.7,
      weight,
      stroke: !!weight,
      radius: this.getRadius(zoom),
    });
    this.addMouseEvents(point);
    return point;
  }
  addMouseEvents(target: Circle | Marker) {
    target.on('mouseover', (e) => {
      this.layer.setStyle({ color: '#10a4fb', fillColor: '#10a4fb' });
      const nameIcon = this.nameLayer.getIcon()!;
      nameIcon.options.className = 'text-[#10a4fb]';
      this.nameLayer.setIcon(nameIcon);
    });
    target.on('mouseout', (e) => {
      this.layer.setStyle({
        color: defaultColor,
        fillColor: defaultColor,
      });
      const nameIcon = this.nameLayer.getIcon()!;
      nameIcon.options.className = 'text-[#e3d3d3]';
      this.nameLayer.setIcon(nameIcon);
    });
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
    return divIcon({
      html: `
          <div class="block rounded-full ${
            width ? 'play-pulse' : ''
          }" style="z-index: 800;width: ${width}px; height: ${width}px; --shadow-width: ${
            width * 0.75
          }px; --shadow-color: ${this.shiningColor};"></div>
        `,
      // html: meta.name,
      className: 'rounded-full',
      iconSize: [width, width],
      iconAnchor: [width / 2, width / 2],
    });
  }
  getShiningLayer(meta: ILinePoint, zoom = 10) {
    const m = marker(meta.coord as LatLngExpression, {
      icon: this.getFlashIcon(meta, zoom),
    });
    this.addMouseEvents(m);
    return m;
  }
  onMapZoom(event: LeafletEvent) {
    const size = (this.meta.name || '').length;
    const zoom = this._map!.getZoom();
    this.nameLayer.setIcon(this.getNameIcon(size, zoom));
    this.layer.setRadius(this.getRadius(zoom));
    const weight = this.getWeight(zoom);
    this.layer.setStyle({
      color: weight ? defaultColor : 'transparent',
      fillColor: weight ? defaultColor : 'transparent',
      weight,
      stroke: !!weight,
    });
    this.shiningLayer.setIcon(this.getFlashIcon(this.meta, zoom));
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
    if (!this.hasSameNameMounted) {
      this.nameLayer.addTo(this._stationGroup!);
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
    this.setHasSameNameMounted({ meta: this.meta, lineMeta: this.lineMeta });
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
    if (shiningOptions.onClick) {
      this.shiningLayer.on('click', shiningOptions.onClick);
    }
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
  bringToFront() {
    // this.layer.bringToFront();
    // throw new Error('Method not implemented.');
    this.detachStation();
    setTimeout(() => {
      this.attachStation();
    });
  }
}
