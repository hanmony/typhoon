import { Injectable } from '@angular/core';
import { midpoint, point } from '@turf/turf';
import {
  LatLngExpression,
  LayerGroup,
  Map as LeafletMap,
  Marker,
  PointExpression,
  divIcon,
  marker,
} from 'leaflet';
import 'proj4leaflet';
import { ActionCategory } from '../../../domain/action.category';
import { ActionDto } from '../../../domain/action.dto';
import { DockComponent } from '../dock/dock.component';
import { EventIllustrationComponent } from '../event-illustration/event-illustration.component';
import { MetroLine } from './classes/metro.line.class';
import { MetroStation } from './classes/metro.station.class';
import { KeyEventType } from './key-event-react.service';
import { MakerDirection } from './meta';
import {
  ALL_EVENT_LABEL_MAP,
  UtilsService,
  mapEffectActionCategory,
} from './utils.service';

interface ForkMarker<P = any> extends Marker<P> {
  direction: MakerDirection;
}
export const symbolPrefix = 'assets/images/map/marker/';
export const symbolMapping: Record<string, string> = {
  树枝侵限: 'oak-branch-invasion@2x.png',
  异物侵限: 'foreign-body-intrusion@2x.png',
  设备故障: 'equipment-failure@2x.png',
  渗漏水: 'leakage-water@2x.png',
  积水: 'leakage2-water@2x.png',
  停运: 'halt@2x.png',
  交路调整: 'intersection-adjustment@2x.png',
  间隔调整: 'interval-adjustment@2x.png',
  正线留车: 'leave-train-front@2x.png',
  提前巡道: 'patrol-in-advance@2x.png',
  限速: 'limit-speed@2x.png',
  关闭车站: 'close-station@2x.png',
  关闭出入口: 'close-entrances-exits@2x.png',
};

type Cancellation = () => void;
type ReactMap = Map<string, (ForkMarker | Cancellation)[]>;
type MarkerMap = Map<string, ForkMarker[]>;
// ========zoom======= [09, 10, 11, 12, 13, 14, 15, 16]
//const stationWidthMap = [+0, +0, +0, +11, 13, 16, 21, 21];
const markerSizeMap = [
  { scale: 0, offset: 0 }, // 09
  { scale: 0, offset: 0 }, // 10
  { scale: 0, offset: 0 }, // 11
  { scale: 0.5, offset: 20 }, // 12
  { scale: 0.75, offset: 35 }, // 13
  { scale: 1, offset: 40 }, // 14
  { scale: 1, offset: 45 }, // 15
  { scale: 1, offset: 45 }, // 16
];
@Injectable({
  providedIn: 'root',
})
export class LocalEventReactService {
  map!: LeafletMap;
  lines!: MetroLine[];
  dock!: DockComponent;
  eventIllustrationRef!: EventIllustrationComponent;
  layerGroup: LayerGroup = new LayerGroup([]);
  reactionMap: ReactMap = new Map();
  markerMap: MarkerMap = new Map();
  constructor(private readonly utils: UtilsService) {}
  init({
    map,
    lines,
    dock,
    eventIllustrationRef,
  }: {
    map: LeafletMap;
    lines: MetroLine[];
    dock: DockComponent;
    eventIllustrationRef: EventIllustrationComponent;
  }) {
    this.map = map;
    this.lines = lines;
    this.layerGroup.addTo(map);
    this.dock = dock;
    this.eventIllustrationRef = eventIllustrationRef;
    this.onMapZoomed(map);
  }
  onMapZoomed(map: LeafletMap) {
    map.on('zoomend', () => {
      const zoom = map.getZoom();
      const { scale, offset } = this.getMarkerSize(zoom);

      Array.from(this.markerMap.entries()).forEach(([_, markers]) => {
        markers.forEach((marker, i) => {
          const icon = marker.getIcon();
          marker.setIcon(
            divIcon({
              ...icon.options,
              iconSize: [scale * 80, scale * 70],
              iconAnchor: this.getMarkerAnchor(
                i + 1,
                scale,
                offset,
                marker.direction,
              ),
            }),
          );
        });
      });
    });
  }
  getSubType(ev: ActionDto) {
    const target = ALL_EVENT_LABEL_MAP.find(([key]) => key === ev.category);
    if (!target) return '';
    const typeText = target[1];
    const typeValue = ev.items[typeText];
    return typeValue || '';
  }
  getLocations(event: ActionDto): string[] {
    const commonGetter = (ev: ActionDto) => {
      const zoneStart = event.items['起始车站'];
      const zoneEnd = event.items['终止车站'];
      if (zoneStart && zoneEnd) {
        if (zoneStart === zoneEnd) {
          return [zoneStart];
        }
        return [zoneStart, zoneEnd];
      }
      return [];
    };
    switch (event.category) {
      case ActionCategory.opevent: {
        const locationType = event.items['类型'];
        const locationLabel = event.items[locationType];
        const zoneStart = event.items['区间起始车站'];
        const zoneEnd = event.items['区间终止车站'];
        if (locationType !== '区间') {
          return locationLabel ? [locationLabel] : [];
        }
        if (zoneStart && zoneEnd) {
          if (zoneStart === zoneEnd) {
            return [zoneStart];
          }
          return [zoneStart, zoneEnd];
        }
        return [];
      }
      case ActionCategory.driving:
        return commonGetter(event);
      case ActionCategory.transport:
      case ActionCategory.disposal:
        return [event.items['车站']];
      case ActionCategory.construction:
        return [];
      case ActionCategory.keynote:
        return commonGetter(event);
      default:
        return [];
    }
  }
  getLine(event: ActionDto) {
    const lineString = event.items['线路'] || event.items['线路号'];
    if (lineString === '3号线4号线共线段') {
      return this.lines.find((l) => l.name === '3号线');
    }
    return this.lines.find((line) => line.name === lineString);
  }
  getMarkerSize(zoom: number) {
    const minZoom = 9;
    return markerSizeMap[zoom - minZoom] || { scale: 0, offset: 0 };
  }
  getMarkerAnchor(
    base: number,
    scale: number,
    offset: number,
    direction: MakerDirection,
  ): PointExpression {
    switch (direction) {
      case 'up':
        return [-((base - 1) * scale * 79 - offset), scale * 35 * 3];
      case 'down':
        return [-((base - 1) * scale * 79 - offset), scale * 35 * -3];
      case 'right':
        return [-((base - 1) * scale * 79 + offset), scale * 35];
      case 'left':
      default:
        return [base * scale * 80 + offset, scale * 35];
    }
  }
  getMarker({
    pos,
    symbol,
    ev,
    direction,
  }: {
    pos: number[];
    symbol: string;
    ev: ActionDto;
    direction: MakerDirection;
  }): ForkMarker {
    const zoom = this.map.getZoom();
    const { scale, offset } = this.getMarkerSize(zoom);
    let base = 1;
    const exit = this.markerMap.get(pos.toString());
    if (exit) {
      base = exit.length + 1;
    }
    const m = marker(pos as LatLngExpression, {
      icon: divIcon({
        html: `<div class="w-full h-full ">
       <img src="${symbol}" class="w-full h-full flex items-center justify-center"  />
      </div>`,
        className: 'hover-border',
        iconSize: [scale * 80, scale * 70],
        iconAnchor: this.getMarkerAnchor(base, scale, offset, direction),
      }),
    }) as ForkMarker;
    m.direction = direction;
    m.on('click', () => {
      if (ev.category === ActionCategory.keynote) {
        this.eventIllustrationRef.onSymbolClick({
          symbol,
          subType: 'keynote',
          category: ev.category,
        });
        return;
      }
      this.dock.openModal(ev.category, [ev]);
    });
    m.setZIndexOffset(1000);

    if (this.markerMap.has(pos.toString())) {
      this.markerMap.get(pos.toString())!.push(m);
    } else {
      this.markerMap.set(pos.toString(), [m]);
    }
    return m;
  }
  autoPlayEffectMap(evs: ActionDto[]) {
    this.clearAllReaction();
    this.react(evs);
  }
  autoPlayClearMap() {
    this.clearAllReaction();
  }
  react(evs: ActionDto[]) {
    const shouldEffects = evs.filter((ev) => {
      return mapEffectActionCategory[ev.category];
    });
    if (!shouldEffects.length) return;
    shouldEffects.forEach((ev) => {
      this.reactSingleEvent(ev);
    });
  }
  reactSingleEvent(ev: ActionDto) {
    switch (ev.category) {
      case ActionCategory.opevent:
        this.reactOpEvent(ev);
        break;
      case ActionCategory.driving:
        this.reactTrafficMeasure(ev);
        break;
      case ActionCategory.transport:
        this.reactPassengerTransportMeasure(ev);
        break;
      case ActionCategory.keynote:
        this.reactKeyNote(ev);
        break;
      default:
        break;
    }
  }
  reactOpEvent(ev: ActionDto) {
    const subType = this.getSubType(ev);
    let symbol = symbolMapping[subType];
    symbol = symbol ? symbolPrefix + symbol : '';
    const line = this.getLine(ev);
    const locations = this.getLocations(ev);
    if (!subType || !symbol || !line || !locations.length) return;
    this.eventIllustrationRef.addSymbolTip(symbol, subType, ev.category);
    const stations: MetroStation[] = locations.map(
      (l) => line.findStationByName(l)!,
    );
    if (stations.some((s) => !s)) {
      console.error('找不到车站');
      return;
    }
    if (stations.length === 1) {
      const marker = this.getMarker({
        pos: stations[0].meta.coord,
        direction: stations[0].meta.makerDirection,
        symbol,
        ev,
      });
      this.layerGroup.addLayer(marker);
      stations[0].shining({ color: '#ffffff' });
      this.reactionMap.set(ev._id, [
        marker,
        () => {
          stations[0].stopShining();
          this.eventIllustrationRef.removeSymbolTip(subType);
        },
      ]);
    } else if (stations.length === 2) {
      const [s1, s2] = stations;
      const point1 = point(s1.meta.coord.slice().reverse());
      const point2 = point(s2.meta.coord.slice().reverse());
      const center = midpoint(point1, point2);
      const marker = this.getMarker({
        pos: center.geometry.coordinates.slice().reverse(),
        direction: 'left',
        symbol,
        ev,
      });
      this.layerGroup.addLayer(marker);
      line.flash(ev._id, s1.name, s2.name);
      this.reactionMap.set(ev._id, [
        marker,
        () => {
          line.stopEffect(ev._id);
          this.eventIllustrationRef.removeSymbolTip(subType);
        },
      ]);
    }
  }
  reactTrafficMeasure(ev: ActionDto) {
    const subType = this.getSubType(ev);
    let symbol = symbolMapping[subType];
    symbol = symbol ? symbolPrefix + symbol : '';
    if (!subType || !symbol) return;

    this.eventIllustrationRef.addSymbolTip(symbol, subType, ev.category);
    const lineString = ev.items['线路号'];
    let line = this.lines.find((l) => l.name === lineString);
    if (lineString === '3号线4号线共线段') {
      line = this.lines.find((l) => l.name === '3号线');
    }
    if (!line) return;

    let start = ev.items['起始车站'];
    let end = ev.items['终止车站'];

    const reactPartialLine = (
      line: MetroLine,
      _start: string,
      _end: string,
    ) => {
      const startStation = line.findStationByName(_start);
      const endStation = line.findStationByName(_end);
      if (!startStation || !endStation) {
        console.error('找不到车站');
        return;
      }
      const startMarker = this.getMarker({
        pos: startStation.meta.coord,
        direction: startStation.meta.makerDirection,
        symbol,
        ev,
      });
      const endMarker = this.getMarker({
        pos: endStation.meta.coord,
        direction: endStation.meta.makerDirection,
        symbol,
        ev,
      });

      this.layerGroup.addLayer(startMarker);
      this.layerGroup.addLayer(endMarker);

      let cancellation: Cancellation = () => {
        line!.stopEffect(ev._id);
        this.eventIllustrationRef.removeSymbolTip(subType);
      };
      if (subType === '停运') {
        line.flashRed(ev._id, startStation.name, endStation.name);
      } else if (subType === '间隔调整' || subType === '交路调整') {
        line.highlightBlue(ev._id, startStation.name, endStation.name);
      } else if (subType === '限速') {
        line.highlightYellow(ev._id, startStation.name, endStation.name);
      } else if (subType === '提前巡道') {
        // line.flow(ev._id, startStation.name, endStation.name, '');
        line.highlightWithBlueBorder(
          ev._id,
          startStation.name,
          endStation.name,
        );
        cancellation = () => {
          // line!.stopFlowing(ev._id);
          line!.stopEffect(ev._id);
          this.eventIllustrationRef.removeSymbolTip(subType);
        };
      } else if (subType === '正线留车') {
        let stations: MetroStation[] = [];
        stations = line.findLineSliceStations(start, end);
        this.eventIllustrationRef.addSymbolTip(symbol, subType, ev.category);
        stations.forEach((s) => {
          s.shining({
            onClick: () => {
              this.dock.openModal(ev.category, [ev]);
            },
            color: 'rgba(16, 185, 129, 0.5)',
          }); // this.dock.openModal(ev.category, [ev]);
          s.bringToFront();
        });
        cancellation = () => {
          stations.forEach((s) => s.stopShining());
          symbol && this.eventIllustrationRef.removeSymbolTip(subType);
        };
      }

      this.reactionMap.set(ev._id, [startMarker, endMarker, cancellation]);
    };

    if (start === '全线' && lineString !== '3号线4号线共线段') {
      const markers: ForkMarker[] = [];
      markers.push(
        this.getMarker({
          pos: line.meta.points[0].coord,
          direction: line.meta.points[0].makerDirection,
          symbol,
          ev,
        }),
      );
      markers.push(
        this.getMarker({
          pos: line.meta.points[line.meta.points.length - 1].coord,
          direction:
            line.meta.points[line.meta.points.length - 1].makerDirection,
          symbol,
          ev,
        }),
      );
      markers.forEach((m) => this.layerGroup.addLayer(m));

      this.reactionMap.set(ev._id, [...markers]);
      // 全线： 停运、间隔调整、交路调整、提前巡道
      if (subType === '停运') {
        line.flashRed(ev._id, start, end);
        this.reactionMap.set(ev._id, [
          ...markers,
          () => {
            line!.stopEffect(ev._id);
            this.eventIllustrationRef.removeSymbolTip(subType);
          },
        ]);
      } else if (subType === '间隔调整' || subType === '交路调整') {
        line.highlightBlue(ev._id, start, end);
        this.reactionMap.set(ev._id, [
          ...markers,
          () => {
            line!.stopEffect(ev._id);
            this.eventIllustrationRef.removeSymbolTip(subType);
          },
        ]);
      } else if (subType === '提前巡道') {
        // line.flow(ev._id, start, end, '');
        line.highlightWithBlueBorder(ev._id, start, end);
        this.reactionMap.set(ev._id, [
          ...markers,
          () => {
            // line!.stopFlowing(ev._id);
            line!.stopEffect(ev._id);
            this.eventIllustrationRef.removeSymbolTip(subType);
          },
        ]);
      }
    } else if (start === '全线' && lineString === '3号线4号线共线段') {
      reactPartialLine(line, '宜山路站', '宝山路站');
    } else if (start === end) {
      const station = line.findStationByName(start);
      if (!station) {
        console.error('找不到车站');
        return;
      }
      const marker = this.getMarker({
        pos: station.meta.coord,
        direction: station.meta.makerDirection,
        symbol,
        ev,
      });
      const colorMap = {
        停运: '#ef4444',
        间隔调整: '#2563eb',
        交路调整: '#2563eb',
        提前巡道: '#fcd34d',
        正线留车: '#fcd34d',
      };
      station.shining({ color: colorMap[subType] || '#ffffff' });

      this.layerGroup.addLayer(marker);
      this.reactionMap.set(ev._id, [
        marker,
        () => {
          // station.stopEffect();
          station.stopShining();
          this.eventIllustrationRef.removeSymbolTip(subType);
        },
      ]);
    } else {
      reactPartialLine(line, start, end);
    }
  }
  reactPassengerTransportMeasure(ev: ActionDto) {
    const subType = this.getSubType(ev);
    if (!subType) return;
    const line = this.lines.find((l) => l.name === ev.items['线路号']);
    if (!line) return;
    const start = ev.items['起始车站'];
    const end = ev.items['终止车站'];
    let stations: MetroStation[] = [];
    if (start === '全线') {
      stations = line.stations.slice();
    } else {
      stations = line.findLineSliceStations(start, end);
    }
    let symbol = symbolMapping[subType];
    symbol = symbol ? symbolPrefix + symbol : '';
    symbol &&
      this.eventIllustrationRef.addSymbolTip(symbol, subType, ev.category);
    stations
      .filter((s) => s.meta.type !== 'depot')
      .forEach((s) => {
        s.shining({
          onClick: () => {
            this.dock.openModal(ev.category, [ev]);
          },
        }); // this.dock.openModal(ev.category, [ev]);
        s.bringToFront();
      });
    const cancellation: Cancellation = () => {
      stations.forEach((s) => s.stopShining());
      symbol && this.eventIllustrationRef.removeSymbolTip(subType);
    };
    this.reactionMap.set(ev._id, [cancellation]);
  }
  reactKeyNote(ev: ActionDto) {
    if (ev.items['类型'] === KeyEventType.report) {
      this.reactReport(ev);
      return;
    } else if (ev.items['类型'] === KeyEventType.popup) {
      this.reactPopup(ev);
    }
  }
  reactPopup(ev: ActionDto) {
    const symbol = symbolPrefix + 'keynote.png';
    this.eventIllustrationRef.addSymbolTip(symbol, 'keynote', ev.category);
    this.reactionMap.set(ev._id, [
      () => {
        this.eventIllustrationRef.removeSymbolTip('keynote');
      },
    ]);
  }
  reactReport(ev: ActionDto) {
    const line = this.getLine(ev);
    if (!line) return;
    const locations = this.getLocations(ev);
    const symbol = symbolPrefix + 'keynote.png';

    this.eventIllustrationRef.addSymbolTip(symbol, 'keynote', ev.category);
    const stations: MetroStation[] = locations.map(
      (l) => line.findStationByName(l)!,
    );
    if (stations.some((s) => !s)) {
      console.error('找不到车站');
      return;
    }
    if (stations.length === 1) {
      const marker = this.getMarker({
        pos: stations[0].meta.coord,
        direction: stations[0].meta.makerDirection,
        symbol,
        ev,
      });
      this.layerGroup.addLayer(marker);
      stations[0].shining({ color: '#ffffff' });
      this.reactionMap.set(ev._id, [
        marker,
        () => {
          stations[0].stopShining();
          this.eventIllustrationRef.removeSymbolTip('keynote');
        },
      ]);
    } else if (stations.length === 2) {
      const [s1, s2] = stations;
      const point1 = point(s1.meta.coord.slice().reverse());
      const point2 = point(s2.meta.coord.slice().reverse());
      const center = midpoint(point1, point2);
      const marker = this.getMarker({
        pos: center.geometry.coordinates.slice().reverse(),
        direction: 'left',
        symbol,
        ev,
      });
      this.layerGroup.addLayer(marker);
      line.hightWithColor(ev._id, s1.name, s2.name, {
        color: '#fff',
        borderColor: '#fcd34d',
      });
      this.reactionMap.set(ev._id, [
        marker,
        () => {
          line.stopEffect(ev._id);
          this.eventIllustrationRef.removeSymbolTip('keynote');
        },
      ]);
    }
  }
  clearReaction(evId: string) {
    this.reactionMap.get(evId)?.forEach((l) => {
      if (typeof l === 'function') {
        return l();
      }
      this.layerGroup.removeLayer(l);
    });
    this.reactionMap.delete(evId);
  }
  clearAllReaction() {
    this.reactionMap.forEach((l, k) => {
      l.forEach((m) => {
        if (typeof m === 'function') {
          return m();
        }
        this.layerGroup.removeLayer(m);
      });
    });
    this.markerMap.clear();
    this.reactionMap.clear();
  }
  locateEvent(ev: ActionDto, zoom = 14, center = false) {
    const line = this.getLine(ev);
    if (!line) return;
    const stations = this.utils.getLocalEventStations(ev);

    if (!stations) return;
    if (Array.isArray(stations)) {
      line.locateStations(stations, zoom, center);
    } else {
      line.locateStation(stations, zoom);
    }
  }
}
