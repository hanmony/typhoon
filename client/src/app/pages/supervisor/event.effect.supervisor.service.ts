import { Injectable } from '@angular/core';
import {
  divIcon,
  FeatureGroup,
  LatLngExpression,
  LeafletEvent,
  Map as LeafletMap,
  Marker,
  marker,
} from 'leaflet';

import 'proj4leaflet';
import { findAncestorWithAttribute } from '../../app.util';
import {
  getDispatchCenterStationIcon,
  getDispatchCenterStationMarker,
  getSupervisorLineIcon,
} from '../../shared/marker';
import {
  getPositionFromEvent,
  linePositionAdjustments,
  SharedEventEffectService,
} from '../../shared/shared.event.effect';
import { linesData2026 } from '../case-detail/services/meta';
import { diffEvents } from '../occ/map/diff.util';
import { MetroLine as OccMetroLine } from '../occ/map/metro.line.class';
import { eventOnMapVisibilityFilter } from '../occ/occ.const';
import { OccEventType } from '../occ/occ.event-bus.model';

interface LocationEventDto {
  type?: string;
  position: LatLngExpression;
  positionString: string;
  meta: ExtremeOcc.Event;
}
interface RemoteMarkerMapArrayItem {
  line: string;
  visible: boolean;
  marker?: Marker;
  position: LatLngExpression;
  data: LocationEventDto[];
  positionString: string;
  removed?: LocationEventDto[];
  added?: LocationEventDto[];
  changed?: boolean;
  removeOrAdd?: number;
}

interface LocalMarkerMapArrayItem {
  marker?: Marker;
  data: LocationEventDto[];
  positionString: string;
  removed?: LocationEventDto[];
  added?: LocationEventDto[];
  changed?: LocationEventDto[];
  removeOrAdd?: number;
}

export const REMOTE_DISTINCT_ZOOM = 12;

const symbolPrefix = 'assets/images/occ/map/';
const symbol = symbolPrefix + 'hexagon-maker-event.png';
const detailBoxSymbol = symbolPrefix + 'detail-event-box.png';
const composeDetailBoxSymbol =
  symbolPrefix + 'detail-event-box-without-tail.png';

export const DETAIL_CHANGE_REPAIR_STATE_ATTR = 'detail-change-repair-state';
export const DETAIL_ON_LIST_CHANGE_REPAIR_STATE_ATTR =
  'detail-on-list-change-repair-state';
export const COMPOSE_LIST_BOX_CLICK_ATTR = 'compose-list-box-click';
const boxItemTextAttr = `${COMPOSE_LIST_BOX_CLICK_ATTR}-item-text`;
const imageReaderAttr = `${COMPOSE_LIST_BOX_CLICK_ATTR}-image-reader`;

const remoteMarkerSizeMap = [
  { scale: 0, offset: 0 }, // 09
  { scale: 0.75, offset: 0 }, // 10
  { scale: 1, offset: 0 }, // 11
  { scale: 0, offset: 20 }, // 12
  { scale: 0, offset: 35 }, // 13
  { scale: 0, offset: 40 }, // 14
  { scale: 0, offset: 45 }, // 15
  { scale: 0, offset: 45 }, // 16
];

const composeMarkerSizeMap = [
  { scale: 0, offset: 0 }, // 09
  { scale: 0, offset: 0 }, // 10
  { scale: 0, offset: 0 }, // 11
  { scale: 0.75, offset: 20 }, // 12
  { scale: 0.75, offset: 35 }, // 13
  { scale: 1, offset: 40 }, // 14
  { scale: 1, offset: 45 }, // 15
  { scale: 1, offset: 45 }, // 16
];

const singleMarkerSizeMap = [
  { scale: 0, offset: 0 }, // 09
  { scale: 0, offset: 0 }, // 10
  { scale: 0, offset: 0 }, // 11
  { scale: 0.15, offset: 20 }, // 12
  { scale: 0.25, offset: 35 }, // 13
  { scale: 0.3, offset: 40 }, // 14
  { scale: 0.4, offset: 45 }, // 15
  { scale: 0.4, offset: 45 }, // 16
];

@Injectable({
  providedIn: 'root',
})
export class SupervisorEventEffectService extends SharedEventEffectService {
  initiated = false;
  map!: LeafletMap;
  lineModels: OccMetroLine[] = [];

  featureGroup = new FeatureGroup([]);
  remoteDataWithMarker: RemoteMarkerMapArrayItem[] = [];
  localDataWithMarker: LocalMarkerMapArrayItem[] = [];
  remoteDistinctZoom = REMOTE_DISTINCT_ZOOM;
  isRemote = true;
  visible = true;

  get singleList() {
    return this.localDataWithMarker.filter((d) => d.data.length === 1);
  }
  get composeList() {
    return this.localDataWithMarker.filter((d) => d.data.length > 1);
  }
  detailPopUpBox?: { data: LocationEventDto; marker: Marker };
  detailListPopUpBox?: { data: LocationEventDto[]; marker: Marker };
  composeItemDetailPopUpBox?: { data: LocationEventDto; marker: Marker };
  events: ExtremeOcc.Event[] = [];

  // constructor(override occEventBusService: OccEventBusService) {
  //   super(occEventBusService);
  // }

  mount(map: LeafletMap, lineModels: OccMetroLine[]) {
    this.map = map;
    this.lineModels = lineModels;

    this.featureGroup.addTo(this.map);
    this.map.on('zoomend', () => {
      this.isRemote = this.map!.getZoom() < 13;
      this.effectWithZoom();
    });
    this.map.on('click', (ev) => {
      this.onMapClick(ev);
    });
  }
  initializeLineEvents(evs: ExtremeOcc.Event[]) {
    this.initiated = true;
    // 过滤掉不显示的事件
    this.events = evs.filter(eventOnMapVisibilityFilter);
    this.initializeRemoteDataWithMarker(this.events);
    this.initializeLocationDataWithMarker(this.events);

    this.updateRemoteMarkerAccordingToDiff(); // 长期存在
  }

  initializeRemoteDataWithMarker(evs: ExtremeOcc.Event[]) {
    this.remoteDataWithMarker = linesData2026.map((l) => {
      const lineModel = this.lineModels.find((m) => m.meta.name === l.name);
      if (linePositionAdjustments[l.name]) {
        const station = lineModel?.findStationByName(
          linePositionAdjustments[l.name],
        )!;
        return {
          line: l.name,
          visible: true,
          position: station.meta.coord as LatLngExpression,
          positionString: station.meta.coord.join(', '),
          data: [],
        };
      }
      const firstStation = lineModel?.stations[0]!;
      const position = firstStation.meta.coord;
      return {
        line: l.name,
        visible: true,
        position: position as LatLngExpression,
        positionString: position.join(', '),
        data: [],
      };
    });
    const pure = evs
      .map((ev) => {
        const lineModel = this.lineModels.find((l) => l.meta.name === ev.line);
        const firstStation = lineModel?.stations[0]!;
        const position = firstStation.meta.coord;
        return {
          position: position as LatLngExpression,
          positionString: position.join(', '),
          meta: ev,
        };
      })
      .filter((m) => m.positionString);
    pure.forEach((p) => {
      const line = this.remoteDataWithMarker.find(
        (item) => item.line === p.meta.line,
      );
      if (line) {
        line.data.push(p);
      }
    });
  }
  setVisibility(visible: boolean) {
    this.visible = visible;
    if (!this.visible) {
      this.hideEffect();
    } else {
      this.revertEffect();
    }
  }

  onLineVisibleChange(currentLines: string[]) {
    this.remoteDataWithMarker.forEach((d) => {
      d.visible = currentLines.includes(d.line);
    });
    this.remoteDataWithMarker.forEach((d) => {
      if (d.visible) {
        if (!d.marker) {
          const marker = this.getRemoteMarker(d);
          this.featureGroup.addLayer(marker);
          d.marker = marker;
        }
      } else {
        d.marker?.remove();
        d.marker = undefined;
      }
    });
  }

  initializeLocationDataWithMarker(evs: ExtremeOcc.Event[]) {
    this.localDataWithMarker = [];
    const pure = evs
      .map((ev) => {
        const lineModel = this.lineModels.find((l) => l.meta.name === ev.line);
        const position = getPositionFromEvent(ev, lineModel!) || [];
        return {
          position: position as LatLngExpression,
          positionString: position.join(', '),
          meta: ev,
        };
      })
      .filter((m) => m.positionString);
    const map: Map<string, LocationEventDto[]> = new Map([]);
    pure.forEach((p) => {
      if (map.get(p.positionString!)) {
        map.get(p.positionString!)?.push(p);
      } else {
        map.set(p.positionString, [p]);
      }
    });
    Array.from(map).map(([posString, item]) => {
      this.localDataWithMarker.push({
        data: item,
        positionString: posString,
      });
    });
  }
  diffEventsAndEffect(evs: ExtremeOcc.Event[]) {
    if (!this.initiated) return;
    const shouldShowEvs = evs.filter(eventOnMapVisibilityFilter);
    // 过滤掉不显示的事件
    this.diffEventsAndEffectRemote(shouldShowEvs);
    this.diffEventsAndEffectLocal(shouldShowEvs);
    this.events = shouldShowEvs;
  }

  findTargetRemoteDtaWithMarkerWithId(evId: string) {
    return this.remoteDataWithMarker.find((d) =>
      d.data.find((dto) => dto.meta.id === evId),
    );
  }

  diffEventsAndEffectRemote(evs: ExtremeOcc.Event[]) {
    this.updateRemoteMarkerAccordingToDiff();
  }

  updateRemoteMarkerAccordingToDiff() {
    this.remoteDataWithMarker.forEach((d) => {
      if (d.marker) return;
      // if (!d.removed && !d.added && !d.changed && !d.removeOrAdd) return;
      this.renderOrUpdateDataWithRemoteMarker(d);

      d.added = undefined;
      d.removed = undefined;
      d.changed = undefined;
      d.removeOrAdd = undefined;
    });
  }

  renderOrUpdateDataWithRemoteMarker(d: RemoteMarkerMapArrayItem) {
    if (d.visible) {
      const marker = this.getRemoteMarker(d);
      this.featureGroup.addLayer(marker);
      d.marker = marker;
    }
  }

  diffEventsAndEffectLocal(evs: ExtremeOcc.Event[]) {
    const diffResult = diffEvents(evs, this.events);
    const { added, removed, changed } = diffResult;
    this.markLocalRemoved(removed);
    this.markLocalAdded(added);
    this.markLocalChanged(changed);

    this.updateMarkerAccordingToDiff();
  }
  markLocalAdded(evs: ExtremeOcc.Event[]) {
    evs.forEach((ev) => {
      const lineModel = this.lineModels.find((l) => l.meta.name === ev.line);
      const locationDto = this.getLocationEventDto(ev, lineModel!);
      const target = this.findLocationTargetDtaWithMarkerWithPosition(
        locationDto.positionString,
      );
      if (target) {
        // target.data.push(locationDto);
        // target.modify = (target.modify || 0) + 1;
        // TODO mark to modify marker
        target.added = [...(target.added || []), locationDto];
        target.removeOrAdd = (target.removeOrAdd || 0) + 1;
      } else {
        const newItem: LocalMarkerMapArrayItem = {
          positionString: locationDto.positionString,
          data: [], // ! Empty data is important
          added: [locationDto],
          removeOrAdd: 1,
        };
        this.localDataWithMarker.push(newItem);

        // TODO mark to add marker
      }
    });
  }
  markLocalRemoved(evs: ExtremeOcc.Event[]) {
    evs.forEach((ev) => {
      // this.removePopupBoxIfEventRemoved(ev);
      const lineModel = this.lineModels.find((l) => l.meta.name === ev.line);
      const locationDto = this.getLocationEventDto(ev, lineModel!);
      const target = this.findLocationTargetDtaWithMarkerWithPosition(
        locationDto.positionString,
      );
      if (target) {
        target.removed = [...(target.removed || []), locationDto];
        target.removeOrAdd = (target.removeOrAdd || 0) - 1;
      }
    });
  }
  markLocalChanged(changed: ExtremeOcc.EventChange[]) {
    changed.forEach((c) => {
      if (c.changes['urgentRepair'] || c.changes['severity']) {
        const target = this.findLocationTargetDtaWithMarkerWithPosition(c.id);
        if (target) {
          const lineModel = this.lineModels.find(
            (l) => l.meta.name === c.entity.line,
          );
          const locationDto = this.getLocationEventDto(c.entity, lineModel!);
          target.changed = [locationDto];
        }
      }
    });
  }

  updateMarkerAccordingToDiff() {
    this.localDataWithMarker.forEach((d) => {
      if (!d.removed && !d.added && !d.changed) return;

      this.renderOrUpdateDataWithLocalMarker(d);

      d.added = undefined;
      d.removed = undefined;
      d.changed = undefined;
      d.removeOrAdd = undefined;
    });
    this.localDataWithMarker = this.localDataWithMarker.filter(
      (d) => d.data.length,
    );
  }

  renderOrUpdateDataWithLocalMarker(d: LocalMarkerMapArrayItem) {
    const previousCount = d.data.length;
    const currentCount = previousCount + (d.removeOrAdd || 0);
    if (currentCount === 0) {
      // 这个位置之前有数据，现在没有数据
      d.marker?.remove();
      d.marker = undefined;
      if (d.data.length === 1) {
        // 之前只有一个, 现在没了
        this.removePopupBoxIfEventRemoved(d.data[0].meta);
        // this.clearEffectWithLocalItem(d);
        this.attachLocalModify(d);
      } else {
        // 之前有多个，现在没了
        this.attachLocalModify(d);
      }
      return;
    }

    if (currentCount === 1) {
      // 之前有多个，现在只有一个
      this.attachLocalModify(d);
      this.renderLocalDegrade(d);
      return;
    }

    if (currentCount > 1) {
      // 之前有多个，现在有多个
      this.attachLocalModify(d);
      this.renderLocalUpgrade(d);
      return;
    }

    if (previousCount === 0) {
      // 这个位置之前没有数据，现在有数据
      this.rerenderLocal(d);
      return;
    }
  }
  renderLocalUpgrade(d: LocalMarkerMapArrayItem) {
    d.marker?.remove();
    d.marker = undefined;
    if (this.detailPopUpBox?.data.meta.id === d.data[0].meta.id) {
      this.removeDetailPopUpBox();
    }
    this.renderComposeItem(d);
    // this.clearEffectWithLocalItem(d);
  }

  attachLocalModify(d: LocalMarkerMapArrayItem) {
    d.data = d.data.filter(
      (ev) => !d.removed?.find((r) => r.meta.id === ev.meta.id),
    );
    d.data.push(...(d.added || []));

    d.changed?.forEach((c) => {
      const alter = d.data.find((d) => d.meta.id === c.meta.id);
      if (alter) {
        Object.assign(alter.meta, c.meta);
      }
    });
  }

  renderLocalDegrade(d: LocalMarkerMapArrayItem) {
    d.marker?.remove();
    d.marker = undefined;
    if (this.detailListPopUpBox?.data[0].positionString === d.positionString) {
      const detailItemId = this.composeItemDetailPopUpBox?.data.meta.id;
      if (detailItemId) {
        if (
          this.detailListPopUpBox.data
            .map((d) => d.meta.id)
            .includes(detailItemId)
        ) {
          this.removeComposeItemDetailPopUpBox();
        }
      }
      this.removeDetailListPopUpBox();
    }
    this.removePopupBoxIfEventRemoved(d.data[0].meta);
    // this.clearEffectWithLocalItem(d);
    this.effectSingle(d);
  }
  effectSingle(item: LocalMarkerMapArrayItem) {
    const { scale } = this.getSingleMarkerSize(this.map.getZoom());
    const dto = item.data[0];
    const marker = this.getSingleMarker(dto, scale);
    if (this.visible) {
      this.featureGroup.addLayer(marker);
    }
    item.marker = marker;
  }
  rerenderLocal(d: LocalMarkerMapArrayItem) {
    d.marker?.remove();
    d.marker = undefined;
    if (d.data.length === 1) {
      this.effectSingle(d);
      // this.renderSingleItem(d);
    } else if (d.data.length > 1) {
      this.renderComposeItem(d);
    }
  }
  removePopupBoxIfEventRemoved(ev: ExtremeOcc.Event) {
    const id = ev.id;
    if (this.detailPopUpBox?.data.meta.id === id) {
      this.removeDetailPopUpBox();
    }
    if (this.detailListPopUpBox?.data.map((d) => d.meta.id).includes(id)) {
      this.removeDetailListPopUpBox();
    }
    if (this.composeItemDetailPopUpBox?.data.meta.id === id) {
      this.removeComposeItemDetailPopUpBox();
    }
  }
  onMapClick(event: LeafletEvent) {
    this.removeDetailPopUpBox();
    this.removeDetailListPopUpBox();
    this.removeComposeItemDetailPopUpBox();
  }
  effectWithZoom() {
    if (!this.remoteDataWithMarker.length) return;
    // const zoom = this.map.getZoom();
    // const currentIsRemote = zoom < this.remoteDistinctZoom;
    this.rerenderAllMarkers();
  }
  rerenderAllMarkers() {
    const zoom = this.map.getZoom();
    const { scale } = this.getRemoteMarkerSize(zoom);
    this.remoteDataWithMarker.forEach((item) => {
      const { marker } = item;
      if (marker) {
        marker.setIcon(getSupervisorLineIcon(item.line, scale));
      }
    });
    this.localDataWithMarker.forEach((e) => {
      const { marker } = e;
      if (!marker) {
        return this.rerenderLocal(e);
      }
      if (e.data.length > 1) {
        // compose event marker
        const { scale } = this.getComposeMarkerSize(this.map.getZoom());
        marker.setIcon(
          this.getComposeMarkerIcon(
            this._composeMarkerWidth,
            this._composeMarkerHeight,
            scale,
            e.data,
            false,
          ),
        );
      } else {
        const { scale } = this.getSingleMarkerSize(this.map.getZoom());
        marker.setIcon(this.getSingleMarkerIcon(e.data[0], scale, zoom, false));
      }
    });
  }

  getLocationEventDto(ev: ExtremeOcc.Event, lineModel: OccMetroLine) {
    const position = getPositionFromEvent(ev, lineModel) || [];
    return {
      position: position as LatLngExpression,
      positionString: position.join(', '),
      meta: ev,
    };
  }
  findLocationTargetDtaWithMarkerWithPosition(s: string) {
    return this.localDataWithMarker.find((d) => d.positionString === s);
  }

  showEffect() {
    this.clearEffect();
    this.renderAndSetMarkers();
  }
  clearEffect() {}

  renderAndSetMarkers() {
    this.renderRemoteMarkers();
  }

  renderLocalMarkers() {}
  renderRemoteMarkers() {
    this.remoteDataWithMarker.forEach((item) => {
      if (item.marker) {
        item.marker.remove();
        item.marker = undefined;
      }
      const marker = this.getRemoteMarker(item);
      this.featureGroup.addLayer(marker);
      item.marker = marker;
    });
  }

  renderComposeMarkers(composeList: LocalMarkerMapArrayItem[]) {
    composeList.forEach((c) => {
      this.renderComposeItem(c);
    });
  }
  renderComposeItem(c: LocalMarkerMapArrayItem) {
    const marker = this.getComposeMarker(c.data);
    if (this.visible) {
      this.featureGroup.addLayer(marker);
    }
    c.marker = marker;
  }

  renderSingleItem(c: LocalMarkerMapArrayItem) {
    const marker = this.getSingleMarker(c.data[0]);
    if (this.visible) {
      this.featureGroup.addLayer(marker);
    }
    c.marker = marker;
  }

  getComposeMarkerSize(zoom: number) {
    const minZoom = 9;
    return composeMarkerSizeMap[zoom - minZoom] || { scale: 0, offset: 0 };
  }
  getSingleMarkerSize(zoom: number) {
    const minZoom = 9;
    return singleMarkerSizeMap[zoom - minZoom] || { scale: 0, offset: 0 };
  }
  _composeMarkerWidth = 83;
  _composeMarkerHeight = 187;
  getComposeMarker(data: LocationEventDto[]) {
    const { position } = data[0];
    const zoom = this.map.getZoom();
    const { scale } = this.getComposeMarkerSize(zoom);
    const m = marker(position as LatLngExpression, {
      icon: this.getComposeMarkerIcon(
        this._composeMarkerWidth,
        this._composeMarkerHeight,
        scale,
        data,
      ),
    }) as Marker;
    m.on('click', (p) => {
      this.toggleDetailListPopUpBox(data);
    });
    return m;
  }
  getComposeMarkerIcon(
    width: number,
    height: number,
    scale: number,
    data: LocationEventDto[],
    animation: boolean = true,
  ) {
    if (scale === 0) {
      return divIcon({
        html: ``,
        iconSize: [0, 0],
      });
    }
    return divIcon({
      html: `<div class="w-full h-full relative ${animation ? 'animate__animated animate__fadeInDown' : ''}">
       <img src="${symbol}" class="w-full h-full flex items-center justify-center"  />
       <div class="absolute left-0 w-full text-center" style="top: ${50 * scale}px;">
        <div class="text-white text-3xl font-normal" style="zoom: ${scale};">${data.length}</div>
       </div>
      </div>`,
      className: 'hover-border',
      iconSize: [width * scale, height * scale],
      iconAnchor: [(width * scale) / 2, height * scale - 5],
    });
  }

  getRemoteMarkerSize(zoom: number) {
    const minZoom = 9;
    return remoteMarkerSizeMap[zoom - minZoom] || { scale: 0, offset: 0 };
  }

  getRemoteMarker(data: RemoteMarkerMapArrayItem) {
    const { position } = data;
    const zoom = this.map.getZoom();
    const { scale } = this.getRemoteMarkerSize(zoom);

    const m = marker(position as LatLngExpression, {
      icon: getSupervisorLineIcon(data.line, scale),
    }) as Marker;

    m.on('click', (p) => {
      this.occEventBusService.dispatch({
        type: OccEventType.LINE_MARKER_CLICK,
        payload: data.line,
      });
    });
    return m;
  }

  getSingleMarkerIcon(
    event: LocationEventDto,
    scale = 1,
    zoom = 10,
    animation: boolean = true,
  ) {
    const { meta } = event;
    return getDispatchCenterStationIcon({ scale, ev: meta });
  }
  getSingleMarker(event: LocationEventDto, scale = 1) {
    const { position, meta } = event;

    return getDispatchCenterStationMarker(
      {
        position,
        scale,
        clickCallback: (ev) => this.toggleDetailPopUpBox(event),
      },
      {
        scale,
        ev: meta,
      },
    );
  }

  removeDetailPopUpBox() {
    if (this.detailPopUpBox?.data) {
      this.detailPopUpBox.marker.remove();
      this.detailPopUpBox = undefined;
    }
  }
  removeDetailListPopUpBox() {
    if (this.detailListPopUpBox?.data) {
      this.detailListPopUpBox.marker.remove();
      this.detailListPopUpBox = undefined;
    }
  }
  removeComposeItemDetailPopUpBox() {
    const data = this.composeItemDetailPopUpBox?.data;
    if (data) {
      this.removeUnderlineFromBoxItem(data);
      this.composeItemDetailPopUpBox!.marker.remove();
      this.composeItemDetailPopUpBox = undefined;
    }
  }

  addUnderlineToBoxItem(data: LocationEventDto) {
    document.querySelectorAll(`[${boxItemTextAttr}]`)!.forEach((e) => {
      if (e.getAttribute('data-id')?.replace('event-', '') === data.meta.id) {
        e.classList.add('underline');
      }
    });
  }
  removeUnderlineFromBoxItem(data: LocationEventDto) {
    document.querySelectorAll(`[${boxItemTextAttr}]`)!.forEach((e) => {
      if (e.getAttribute('data-id')?.replace('event-', '') === data.meta.id) {
        e.classList.remove('underline');
      }
    });
  }
  toggleDetailPopUpBox(data: LocationEventDto) {
    if (this.detailPopUpBox?.data) {
      if (this.detailPopUpBox?.data.meta.id === data.meta.id) {
        this.removeDetailPopUpBox();
        return;
      }
      this.removeDetailPopUpBox();
    }
    this.renderDetailPopUpBox(data);
  }
  toggleDetailListPopUpBox(data: LocationEventDto[]) {
    const removeChildBox = () => {
      const detailItemId = this.composeItemDetailPopUpBox?.data.meta.id;
      if (detailItemId) {
        if (data.map((d) => d.meta.id).includes(detailItemId)) {
          this.removeComposeItemDetailPopUpBox();
        }
      }
    };
    if (this.detailListPopUpBox?.data) {
      if (
        this.detailListPopUpBox?.data[0].positionString ===
        data[0].positionString
      ) {
        this.removeDetailListPopUpBox();
        removeChildBox();
        return;
      }
      this.removeDetailListPopUpBox();
      this.removeComposeItemDetailPopUpBox();
    }
    this.renderDetailListPopUpBox(data);
  }
  toggleComposeItemDetailPopUpBox(data: LocationEventDto) {
    if (this.composeItemDetailPopUpBox?.data) {
      if (this.composeItemDetailPopUpBox?.data.meta.id === data.meta.id) {
        this.removeComposeItemDetailPopUpBox();
        return;
      }
      this.removeComposeItemDetailPopUpBox();
    }
    this.renderComposeItemDetailPopUpBox(data);
  }

  renderDetailPopUpBox(data: LocationEventDto) {
    const m = this.getDetailPopUpBox(data, false);
    this.detailPopUpBox = {
      data,
      marker: m,
    };
    m.addTo(this.map);
    m.setZIndexOffset(1000);
  }

  renderDetailListPopUpBox(data: LocationEventDto[]) {
    const m = this.getDetailListPopUpBox(data);
    this.detailListPopUpBox = {
      data,
      marker: m,
    };
    m.addTo(this.map);
    m.setZIndexOffset(1000);
  }

  renderComposeItemDetailPopUpBox(data: LocationEventDto) {
    const scale = this.getComposeMarkerSize(this.map.getZoom()).scale;
    // const targetHeight = 105;
    const targetWidth = 48;
    const listBoxWidth = 120;
    const m = this.getDetailPopUpBox(data, false, {
      boxSymbol: composeDetailBoxSymbol,
      iconSize: [428, 250],
      iconAnchor: [-(targetWidth * scale + listBoxWidth), 250 / 2],
    });
    this.composeItemDetailPopUpBox = {
      data,
      marker: m,
    };
    m.addTo(this.map);
    m.setZIndexOffset(1000);
    this.addUnderlineToBoxItem(data);
  }

  getDetailListPopUpBox(data: LocationEventDto[]) {
    const scale = this.getComposeMarkerSize(this.map.getZoom()).scale;
    const position = data[0].position;
    const targetHeight = 105;
    const targetWidth = 48;
    const itemHeight = 32;
    const boxHeight = data.length * itemHeight + 4;
    const boxWidth = 120;

    const getBoxItem = (data: LocationEventDto) => {
      return `<div class="px-3" style="border-bottom: 1px solid #FFFFFF22; height: ${itemHeight}px; line-height: ${itemHeight}px;">
                <div class="flex items-center">
                  <span class="inline-block rounded-full w-2 h-2 mr-2" style="background: ${data.meta.severity === 0 ? '#1483FA' : '#ef4444'};"></span>
                  <span ${boxItemTextAttr} data-id="event-${data.meta.id}" class="mr-2 ${data.meta.severity === 0 ? 'hover:text-blue-500' : 'hover:text-red-500'}">${
                    data.meta.eventType === '其他事件'
                      ? data.meta.otherEvent
                      : data.meta.eventType
                  }</span>
                  <span>${
                    data.meta.urgentRepair
                      ? '<svg style="position: relative; top: 1px; width: 14px; height: 14px; color: #fde047;" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" viewBox="0 0 24 24"><path d="M7 10h3V7L6.5 3.5a6 6 0 0 1 8 8l6 6a2 2 0 0 1-3 3l-6-6a6 6 0 0 1-8-8L7 10" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"></path></svg>'
                      : ''
                  }</span>
                </div>
            </div>`;
    };

    const m = marker(position as LatLngExpression, {
      icon: divIcon({
        html: `<div ${DETAIL_CHANGE_REPAIR_STATE_ATTR} class="w-full h-full py-1 relative shining-box rounded-md text-sm animate__animated animate__zoomInLeft" style="backdrop-filter: blur(4px);">
          ${data.map(getBoxItem).join('')}
        </div>`,
        className: 'hover-border',
        iconSize: [boxWidth, boxHeight],
        iconAnchor: [
          -targetWidth * scale,
          targetHeight * scale + boxHeight / 2,
        ],
      }),
    }) as Marker;
    m.on('click', (p) => {
      const emitDom = p.originalEvent.target as HTMLElement;
      if (findAncestorWithAttribute(emitDom, DETAIL_CHANGE_REPAIR_STATE_ATTR)) {
        if (emitDom.hasAttribute(boxItemTextAttr)) {
          const id = emitDom.getAttribute('data-id')?.replace('event-', '');
          const itemData = data.find((d) => d.meta.id === id);
          if (itemData) {
            this.toggleComposeItemDetailPopUpBox(itemData);
          }
        }
      }
    });
    return m;
  }

  hide() {
    this.featureGroup.clearLayers();
    this.removeDetailPopUpBox();
  }
  hideEffect() {
    this.hide();
  }

  revert() {
    this.remoteDataWithMarker.forEach((e) => {
      e.marker && this.featureGroup.addLayer(e.marker);
    });
    this.localDataWithMarker.forEach((e) => {
      e.marker && this.featureGroup.addLayer(e.marker);
    });
  }

  revertEffect() {
    if (!this.visible) return;
    this.revert();
  }
}
