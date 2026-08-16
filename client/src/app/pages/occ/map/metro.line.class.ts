import {
  LatLngExpression,
  Map as LeafletMap,
  polyline,
  type Polyline,
} from 'leaflet';
import 'proj4leaflet';
import { depots, ILineData, ILinePoint } from '../../case-detail/services/meta';
import { getAnimationFrame } from '../../case-detail/utils';
import { OccEventBusService } from '../occ.event-bus.service';
import { MetroStation, MetroStationOptions } from './metro.station.class';

export interface MetroLineOptions {
  meta: ILineData;
  eventBus: OccEventBusService;
}

export const METRO_RUNNING_COLOR = '#10b981';

// =====zoom===== [09, 10, 11, 12, 13, 14, 15, 16]
// prettier-ignore
// const weightMap = [+3, +3, +5, +8, 10, 12, 14, 16];
const weightMap = [+3, +3, +3, +5, +5, +5, +5, +5];
const borderMap = [+0, +0, +2, +3, +3, +4, +4, +6];
// const delayMap = [6000, 3000, 1500, 1200, 800, 600, 400, 400];

const localStorageWeightMap = localStorage.getItem('weightMap');

const MIN_OPACITY = -0.2;
const MAX_OPACITY = 1.5;

class MetroDepot extends MetroStation {
  constructor({ meta, lineMeta, eventBus }: MetroStationOptions) {
    super({ meta, lineMeta, eventBus });
  }
}

export class MetroLine {
  eventBus: OccEventBusService;
  _mounted = false;
  protected _attached = false;
  protected _map?: LeafletMap;
  protected _lineGroup?: L.LayerGroup;
  protected _stationGroup?: L.LayerGroup;
  id: string;
  name: string;
  currentColor: string;
  stations: MetroStation[] = [];
  meta: ILineData;
  layer: Polyline;
  branches: Polyline[];

  flashLayerMap = new Map<string, Polyline[]>();
  flowLayerMap = new Map<
    string,
    {
      path: Polyline;
      points: LatLngExpression[];
    }[]
  >();
  opacity: Record<string, number> = {};
  opacityDesc: Record<string, boolean> = {};
  animationFrameTimer: Record<string, number | undefined> = {};
  animationFrameFunc = getAnimationFrame();

  locateMode = 0;

  constructor({ meta, eventBus }: MetroLineOptions) {
    this.eventBus = eventBus;
    this.id = meta.name;
    this.name = meta.name;
    this.currentColor = meta.color;
    this.meta = meta;
    this.layer = this.getMetroLine(meta);
    this.branches = this.getBranchesLine(meta);
    this.stations = [...this.getStations(meta), ...this.getDepots(meta)];
  }
  setLocateMode(type: number) {
    this.locateMode = type;
    this.stations.forEach((e) => {
      e.setLocateMode(type);
    });
  }
  getStationsFromPoint(meta: ILineData, point: ILinePoint) {
    return new MetroStation({
      meta: point,
      lineMeta: meta,
      eventBus: this.eventBus,
    });
  }
  getStationsFromPoints(meta: ILineData, points: ILinePoint[]) {
    return points
      .filter((e) => e.type === 'station')
      .map((e) => this.getStationsFromPoint(meta, e))
      .filter((e) => !!e);
  }
  getStations(meta: ILineData) {
    let result = [...this.getStationsFromPoints(meta, meta.points)];
    if (!meta.branches.size) return result;
    Array.from(meta.branches).forEach(([_name, points]) => {
      result = result.concat(this.getStationsFromPoints(meta, points));
    });
    return result;
  }
  getDepots(meta: ILineData) {
    return depots
      .filter((e) => e.line === meta.name)
      .map(
        (e) =>
          new MetroDepot({
            eventBus: this.eventBus,
            lineMeta: meta,
            meta: {
              name: e.name,
              coord: e.coord,
              type: 'depot',
              makerDirection: 'left',
            },
          }),
      );
  }
  getMetroLine(meta: ILineData) {
    const line = polyline(
      meta.points.map((e) => e.coord) as L.LatLngExpression[],
      {
        color: meta.color || METRO_RUNNING_COLOR,
        weight: this.getWeight(),
      },
    );
    // line.on('zoomend', this.onMapZoom.bind(this));
    this.attachLineListeners(line);
    return line;
  }
  setLineColor(color: string) {
    this.layer.setStyle({ color });
    this.branches.forEach((e) => {
      e.setStyle({ color });
    });
    this.currentColor = color;
  }
  setRunningColor() {
    this.setLineColor(METRO_RUNNING_COLOR);
  }
  hideStationName() {
    this.stations.forEach((e) => {
      e.hideName();
    });
  }
  revertStationName() {
    this.stations.forEach((e) => {
      e.revertName();
    });
  }
  detachStations() {
    this.stations.forEach((e) => {
      e.detachStation();
    });
  }
  attachStations() {
    if (this._attached) {
      this.stations.forEach((e) => {
        e.setHasSameNameMounted();
        e.attachStation();
      });
    }
  }
  revertColor() {
    this.setLineColor(this.meta.color || METRO_RUNNING_COLOR);
  }
  attachLineListeners(line: Polyline) {
    line.on('mouseover', (e) => {
      const color = this.meta.colorDto.darken(0.4).hex();
      this.layer.setStyle({ color });
      this.branches.forEach((e) => {
        e.setStyle({ color });
      });
    });
    line.on('mouseout', (e) => {
      this.layer.setStyle({ color: this.currentColor });
      this.branches.forEach((e) => {
        e.setStyle({ color: this.currentColor });
      });
    });
    line.on('click', (e) => {});
  }
  getBranchesLine(meta: ILineData) {
    if (!meta.branches.size) return [];
    const branches = [] as Polyline[];
    Array.from(meta.branches).forEach(([_name, points]) => {
      const latlngs = points.map((e) => e.coord) as L.LatLngExpression[];
      if (points[0].type !== 'station') {
        latlngs.unshift(
          meta.points[meta.points.length - 1].coord as L.LatLngExpression,
        );
      } else if (points[points.length - 1].type !== 'station') {
        latlngs.push(meta.points[0].coord as L.LatLngExpression);
      }
      const line = polyline(latlngs, {
        color: meta.color || '#f3d',
        weight: this.getWeight(),
      });
      this.attachLineListeners(line);
      branches.push(line);
    });
    return branches;
  }
  findStationByName(name: string) {
    return this.stations.find((e) => e.name === name);
  }
  findLineSliceStations(station1: string, station2: string): MetroStation[] {
    const s1 = this.findStationByName(station1);
    const s2 = this.findStationByName(station2);
    if (!s1 || !s2) return [];
    const main1 = this.meta.points.findIndex((e) => e.name === station1);
    const main2 = this.meta.points.findIndex((e) => e.name === station2);
    if (main1 !== -1 && main2 !== -1) {
      const min = Math.min(main1, main2);
      const max = Math.max(main1, main2);
      return this.meta.points
        .slice(min, max + 1)
        .filter((e) => e.type === 'station')
        .map((e) => this.findStationByName(e.name!)!);
    } else if (main1 !== -1 || main2 !== -1) {
      const main = main1 !== -1 ? main1 : main2;
      let branchIndex: [string, number] = ['', -1];
      this.meta.branches.forEach((e, i) => {
        const cur = e.findIndex((e) => e.name === station1);
        if (cur !== -1) branchIndex = [i, cur];
      });
      if (!branchIndex[0]) return [];
      const branch = this.meta.branches.get(branchIndex[0])!;
      return ([] as ILinePoint[])
        .concat(
          this.meta.points.slice(main, this.meta.points.length),
          branch.slice(0, branchIndex[1] + 1),
        )
        .filter((e) => e.type === 'station')
        .map((e) => this.findStationByName(e.name!)!);
    } else if (main1 === -1 && main2 === -1) {
      let branchIndex: [string, number, number] = ['', -1, -1];
      this.meta.branches.forEach((e, i) => {
        const cur1 = e.findIndex((e) => e.name === station1);
        const cur2 = e.findIndex((e) => e.name === station2);
        if (cur1 !== -1 && cur2 !== -1) branchIndex = [i, cur1, cur2];
      });
      if (!branchIndex[0]) return [];
      const branch = this.meta.branches.get(branchIndex[0])!;
      const min = Math.min(branchIndex[1], branchIndex[2]);
      const max = Math.max(branchIndex[1], branchIndex[2]);
      return branch
        .slice(min, max + 1)
        .filter((e) => e.type === 'station')
        .map((e) => this.findStationByName(e.name!)!);
    }
    return [];
  }
  getWeight(zoom = 10) {
    const minZoom = 9;
    const actualWeightMap = localStorageWeightMap
      ? JSON.parse(localStorageWeightMap)
      : weightMap;
    return actualWeightMap[zoom - minZoom] || 0;
  }
  getBorder(zoom = 10) {
    const minZoom = 9;
    return borderMap[zoom - minZoom] || 0;
  }
  // getDelay(zoom = 10) {
  //   const minZoom = 9;
  //   return delayMap[zoom - minZoom] || 0;
  // }
  onMapZoom(event: L.LeafletEvent) {
    const zoom = this._map!.getZoom();
    const currentWeight = this.getWeight(zoom);
    const currentBorder = this.getBorder(zoom);
    this.layer.setStyle({ weight: currentWeight });
    this.branches.forEach((e) => {
      e.setStyle({ weight: currentWeight });
    });
    this.flashLayerMap.forEach((e) => {
      e.forEach((f) => {
        const isBorder = f.options.className === 'borders';
        f.setStyle({
          weight: isBorder ? currentBorder + currentWeight : currentWeight,
        });
      });
    });
    const flows = Array.from(this.flowLayerMap.entries());
    flows.forEach(([key, e]) => {
      this.flowLayerMap.delete(key);
      e.forEach((f) => {
        f.path.remove();
        setTimeout(() => {
          this.getFlowSlice(key, f.points);
        }, 100);
      });
    });
    // flows.length && this.stations.forEach((e) => e.bringToFront());
  }
  mount(
    [lineGroup, stationGroup]: [L.LayerGroup, L.LayerGroup],
    map: LeafletMap,
  ) {
    if (!this._map) {
      this._map = map;
      this._lineGroup = lineGroup;
      this._stationGroup = stationGroup;
      this.attachLine(true);
      this.stations.forEach((e) => e.mount(stationGroup, map));
      this._map.on('zoomend', this.onMapZoom.bind(this));
      this._mounted = true;
    }
  }
  unmount(map: LeafletMap) {
    if (this._map) {
      this._mounted = false;
      this.stations.forEach((e) => e.unmount());
      this.detachLine();
      this._map = undefined;
      this._lineGroup = undefined;
      this._stationGroup = undefined;
    }
  }
  attachLine(mount: boolean = false) {
    if (!this._attached && this._lineGroup) {
      this._attached = true;
      // this.layer.addTo(this._map!);
      this._lineGroup!.addLayer(this.layer);
      this.layer.bringToFront();
      this.branches.forEach((e) => this._lineGroup!.addLayer(e));
      // this.branches.forEach((e) => e.addTo(this._map!));
      !mount && this.stations.forEach((e) => e.attachStation());
    }
  }
  detachLine() {
    if (this._attached) {
      this._attached = false;
      // this._map!.removeLayer(this.layer);
      // this.branches.forEach((e) => this._map!.removeLayer(e));
      this._lineGroup!.removeLayer(this.layer);
      this.branches.forEach((e) => this._lineGroup!.removeLayer(e));
      this.stations.forEach((e) => e.detachStation());
    }
  }
  followVisibility(lines: (string | number)[]) {
    const visibility = lines.findIndex((e) => e === this.id) > -1;
    if (visibility) {
      this.attachLine();
      this.stations.forEach((e) => e.followVisibility(visibility));
    } else {
      this.detachLine();
    }
  }
  show() {
    this.attachLine();
    this.stations.forEach((e) => e.attachStation());
  }
  getEffectSlice(
    evId: string,
    points: L.LatLngExpression[],
    { color, borderColor }: { color?: string; borderColor?: string },
  ) {
    const line = polyline(points, {
      color: color || this.meta.color,
      weight: this.getWeight(this._map?.getZoom()),
      opacity: this.opacity[evId] || MAX_OPACITY,
    });
    const borders = polyline(points, {
      className: 'borders',
      color: borderColor || '#fff',
      weight:
        this.getBorder(this._map?.getZoom()) +
        this.getWeight(this._map?.getZoom()),
    });
    borders.addTo(this._lineGroup!);
    line.addTo(this._lineGroup!);
    if (this.flashLayerMap.has(evId)) {
      this.flashLayerMap.get(evId)!.push(borders, line);
    } else {
      this.flashLayerMap.set(evId, [borders, line]);
    }
    this.opacity[evId] = this.opacity[evId] || MAX_OPACITY;

    // line.on('click', (e) => {
    //   this.caseComponent?.openLineDataModal(this.name);
    // });
    this.attachLineListeners(line);
    return line;
  }
  getFlowSlice(evId: string, points: L.LatLngExpression[]) {
    const weight = this.getWeight(this._map?.getZoom());
    const path = polyline(points, {
      // dashArray: [weight, weight * 3],
      // dashOffset: `${weight * 4}`,
      weight: weight,
      // color: '#10b98190',
      color: '#10b98190',
      className: ' stroke-with',
      fillColor: '#1d4ed8',
    });
    path.addTo(this._lineGroup!);
    if (this.flowLayerMap.has(evId)) {
      this.flowLayerMap.get(evId)!.push({
        path: path,
        points: points,
      });
    } else {
      this.flowLayerMap.set(evId, [
        {
          path: path,
          points: points,
        },
      ]);
    }
    this.attachLineListeners(path);
    return path;
  }
  getLineSlice(station1: string, station2: string) {
    const s1 = this.findStationByName(station1);
    const s2 = this.findStationByName(station2);
    if (!s1 || !s2) return null;
    const main1 = this.meta.points.findIndex((e) => e.name === station1);
    const main2 = this.meta.points.findIndex((e) => e.name === station2);
    if (main1 !== -1 && main2 !== -1) {
      const min = Math.min(main1, main2);
      const max = Math.max(main1, main2);
      return this.meta.points.slice(min, max + 1).map((e) => e.coord);
    } else if (main1 !== -1 || main2 !== -1) {
      const main = main1 !== -1 ? main1 : main2;
      let branchIndex: [string, number] = ['', -1];
      const branchStationName = main1 !== -1 ? station2 : station1;
      this.meta.branches.forEach((e, i) => {
        const cur = e.findIndex((e) => e.name === branchStationName);
        if (cur !== -1) branchIndex = [i, cur];
      });
      if (!branchIndex[0]) return null;
      const branch = this.meta.branches.get(branchIndex[0])!;
      return ([] as ILinePoint[])
        .concat(
          this.meta.points.slice(main, this.meta.points.length),
          branch.slice(0, branchIndex[1] + 1),
        )
        .map((e) => e.coord);
    } else if (main1 === -1 && main2 === -1) {
      let branchIndex: [string, number, number] = ['', -1, -1];
      this.meta.branches.forEach((e, i) => {
        const cur1 = e.findIndex((e) => e.name === station1);
        const cur2 = e.findIndex((e) => e.name === station2);
        if (cur1 !== -1 && cur2 !== -1) branchIndex = [i, cur1, cur2];
      });
      if (!branchIndex[0]) return null;
      const branch = this.meta.branches.get(branchIndex[0])!;
      const min = Math.min(branchIndex[1], branchIndex[2]);
      const max = Math.max(branchIndex[1], branchIndex[2]);
      return branch.slice(min, max + 1).map((e) => e.coord);
    }
    return null;
  }
  getSliceStations(station1: string, station2: string) {
    const s1 = this.findStationByName(station1);
    const s2 = this.findStationByName(station2);
    if (!s1 || !s2) return [];
    const main1 = this.meta.points.findIndex((e) => e.name === station1);
    const main2 = this.meta.points.findIndex((e) => e.name === station2);
    if (main1 !== -1 && main2 !== -1) {
      const min = Math.min(main1, main2);
      const max = Math.max(main1, main2);
      const names = this.meta.points
        .slice(min, max + 1)
        .filter((e) => e.name)
        .map((e) => e.name);
      return this.stations.filter((e) => names.includes(e.name));
    } else if (main1 !== -1 || main2 !== -1) {
      const main = main1 !== -1 ? main1 : main2;
      let branchIndex: [string, number] = ['', -1];
      this.meta.branches.forEach((e, i) => {
        const cur = e.findIndex((e) => e.name === station1);
        if (cur !== -1) branchIndex = [i, cur];
      });
      if (!branchIndex[0]) return [];
      const branch = this.meta.branches.get(branchIndex[0])!;
      const names = ([] as ILinePoint[])
        .concat(
          this.meta.points.slice(main, this.meta.points.length),
          branch.slice(0, branchIndex[1] + 1),
        )
        .filter((e) => e.name)
        .map((e) => e.name);
      return this.stations.filter((e) => names.includes(e.name));
    } else if (main1 === -1 && main2 === -1) {
      let branchIndex: [string, number, number] = ['', -1, -1];
      this.meta.branches.forEach((e, i) => {
        const cur1 = e.findIndex((e) => e.name === station1);
        const cur2 = e.findIndex((e) => e.name === station2);
        if (cur1 !== -1 && cur2 !== -1) branchIndex = [i, cur1, cur2];
      });
      if (!branchIndex[0]) return [];
      const branch = this.meta.branches.get(branchIndex[0])!;
      const min = Math.min(branchIndex[1], branchIndex[2]);
      const max = Math.max(branchIndex[1], branchIndex[2]);
      const names = branch
        .slice(min, max + 1)
        .filter((e) => e.name)
        .map((e) => e.name);
      return this.stations.filter((e) => names.includes(e.name));
    }
    return [];
  }
  createFlashSlice(
    evId: string,
    station1: string,
    station2: string,
    { color, borderColor }: { color?: string; borderColor?: string },
  ) {
    const points = this.getLineSlice(station1, station2);
    if (!points) return;
    return this.getEffectSlice(evId, points as L.LatLngExpression[], {
      color,
      borderColor,
    });
  }
  createFlowSlice(
    evId: string,
    station1: string,
    station2: string,
    direction: string,
  ) {
    const points = this.getLineSlice(station1, station2);
    if (!points) return;
    return this.getFlowSlice(evId, points as L.LatLngExpression[]);
  }

  flash(evId: string, station1: string, station2: string) {
    const cache = this.flashLayerMap.get(evId);
    if (cache) {
      cache.forEach((l) => l.addTo(this._map!));
      this.flashFn(evId);
    } else {
      const slice = this.createFlashSlice(evId, station1, station2, {
        color: this.meta.color,
      });
      if (!slice) return;
      this.flashFn(evId);
    }
    this.getSliceStations(station1, station2).forEach((s) => s.bringToFront());
  }
  hightWithColor(
    evId: string,
    station1: string,
    station2: string,
    {
      color,
      flash = true,
      borderColor,
    }: { color?: string; flash?: boolean; borderColor?: string },
  ) {
    if (station1 !== '全线') {
      const cache = this.flashLayerMap.get(evId);
      if (cache) {
        cache.forEach((l) => l.addTo(this._lineGroup!));
        flash && this.flashFn(evId);
      } else {
        const slice = this.createFlashSlice(evId, station1, station2, {
          color,
          borderColor,
        });
        if (!slice) return;
        flash && this.flashFn(evId);
      }
      this.getSliceStations(station1, station2).forEach((s) =>
        s.bringToFront(),
      );
    } else {
      const cache = this.flashLayerMap.get(evId);
      if (cache) {
        cache.forEach((l) => l.addTo(this._lineGroup!));
      } else {
        const paths = [
          this.getEffectSlice(
            evId,
            this.meta.points.map((e) => e.coord) as L.LatLngExpression[],
            { color, borderColor },
          ),
        ];
        this.meta.branches.forEach((e) => {
          const subPath = this.getEffectSlice(
            evId,
            e.map((e) => e.coord) as L.LatLngExpression[],
            { color, borderColor },
          );
          paths.push(subPath);
        });
      }
      if (flash) this.flashFn(evId);
      this.stations.forEach((s) => s.bringToFront());
    }
  }
  flashRed(evId: string, station1: string, station2: string) {
    this.hightWithColor(evId, station1, station2, { color: '#ef4444' });
  }
  flashBlue(evId: string, station1: string, station2: string) {
    this.hightWithColor(evId, station1, station2, { color: '#2563eb' });
  }
  flashDeepGreen(evId: string, station1: string, station2: string) {
    this.hightWithColor(evId, station1, station2, { color: '#166534' });
  }
  flashPurple(evId: string, station1: string, station2: string) {
    this.hightWithColor(evId, station1, station2, { color: '#7c3aed' });
  }
  flashYellow(evId: string, station1: string, station2: string) {
    this.hightWithColor(evId, station1, station2, { color: '#fcd34d' });
  }
  highlightRed(evId: string, station1: string, station2: string) {
    this.hightWithColor(evId, station1, station2, {
      color: '#ef4444',
      flash: false,
    });
  }
  highlightBlue(evId: string, station1: string, station2: string) {
    this.hightWithColor(evId, station1, station2, {
      color: '#2563eb',
      flash: false,
    });
  }
  highlightGray(evId: string, station1: string, station2: string) {
    this.hightWithColor(evId, station1, station2, {
      color: '#71717a',
      flash: false,
    });
  }
  highlightYellow(evId: string, station1: string, station2: string) {
    this.hightWithColor(evId, station1, station2, {
      color: '#fcd34d',
      flash: false,
    });
  }
  highlightBorderWithColor(
    evId: string,
    station1: string,
    station2: string,
    { borderColor }: { borderColor: string },
  ) {
    this.hightWithColor(evId, station1, station2, {
      flash: false,
      color: METRO_RUNNING_COLOR,
      borderColor,
    });
  }
  highlightWithBlueBorder(evId: string, station1: string, station2: string) {
    this.highlightBorderWithColor(evId, station1, station2, {
      borderColor: '#2563eb',
    });
  }
  flow(evId: string, station1: string, station2: string, direction: string) {
    if (station1 !== '全线') {
      const cache = this.flowLayerMap.get(evId);
      if (cache) {
        cache.forEach((l) => l.path.addTo(this._lineGroup!));
      } else {
        const slice = this.createFlowSlice(evId, station1, station2, direction);
        if (!slice) return;
      }
      this.getSliceStations(station1, station2).forEach((s) =>
        s.bringToFront(),
      );
    } else {
      const cache = this.flowLayerMap.get(evId);
      if (cache) {
        cache.forEach((l) => l.path.addTo(this._lineGroup!));
      } else {
        const paths = [
          this.getFlowSlice(
            evId,
            this.meta.points.map((e) => e.coord) as L.LatLngExpression[],
          ),
        ];
        this.meta.branches.forEach((e) => {
          const subPath = this.getFlowSlice(
            evId,
            e.map((e) => e.coord) as L.LatLngExpression[],
          );
          paths.push(subPath);
        });
      }
      this.stations.forEach((s) => s.bringToFront());
    }
  }
  stopFlowing(evId: string) {
    this.flowLayerMap.get(evId)?.forEach((l) => {
      if (l) {
        l.path.remove();
      }
    });
    this.flowLayerMap.delete(evId);
  }
  flashFn(evId: string) {
    const slices = this.flashLayerMap.get(evId)!;
    if (this.opacity[evId] <= MIN_OPACITY) {
      this.opacityDesc[evId] = true;
      this.opacity[evId] = MIN_OPACITY;
    } else if (this.opacity[evId] >= MAX_OPACITY) {
      this.opacityDesc[evId] = false;
      this.opacity[evId] = MAX_OPACITY;
    }
    if (this.opacityDesc[evId]) {
      this.opacity[evId] += 0.0075;
    } else {
      this.opacity[evId] -= 0.0075;
    }
    slices.forEach((l) =>
      l.setStyle({
        opacity: Math.min(1, Math.max(this.opacity[evId], 0)),
      }),
    );

    this.animationFrameTimer[evId] = this.animationFrameFunc(
      this.flashFn.bind(this, evId),
    );
  }
  stopEffect(evId: string) {
    this.cancelAnimation(evId);
    const slice = this.flashLayerMap.get(evId);
    if (slice) {
      slice.forEach((l) => l.remove());
      // this.flashLayerMap.delete(evId);
      // this.opacity[evId] = MAX_OPACITY;
      // slice.forEach((l) =>
      //   l.setStyle({
      //     opacity: 1,
      //   }),
      // );
    }
  }
  bringEffectToFront(evId: string) {
    const slice = this.flashLayerMap.get(evId);
    if (slice) {
      slice.forEach((l) => l.bringToFront());
    }
  }
  cancelAnimation(evId: string) {
    if (this.animationFrameTimer[evId]) {
      window.cancelAnimationFrame(this.animationFrameTimer[evId]!);
      this.animationFrameTimer[evId] = undefined;
    }
  }
  locateStations(stations: string[], zoom = 14, center = false) {
    const [start, end] = stations;
    if (!end || start === end) {
      this.locateStation(start);
      return;
    }
    const startStation = this.stations.find((s) => s.name === start);
    const endStation = this.stations.find((s) => s.name === end);
    if (!startStation || !endStation) return;
    if (center) {
      const centerCoord = this.calcCenterPoint(
        startStation.meta.coord,
        endStation.meta.coord,
      );
      this._map!.flyTo(centerCoord as LatLngExpression, zoom);
      return;
    }
    this._map!.flyTo(startStation.meta.coord as LatLngExpression, zoom);
  }

  locateStation(station: string, zoom = 14) {
    let stationModel = this.stations.find((s) => s.name === station);
    if (station === '全线') {
      stationModel = this.stations[0];
    }
    if (!stationModel) return;
    const { coord } = stationModel.meta;
    this._map!.flyTo(coord as LatLngExpression, zoom);
  }
  calcCenterPoint(p1: number[], p2: number[]) {
    return [(p1[0] + p2[0]) / 2, (p1[1] + p2[1]) / 2];
  }
}
