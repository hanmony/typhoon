import { Injectable } from '@angular/core';
import {
  divIcon,
  FeatureGroup,
  LatLngExpression,
  LeafletEvent,
  Map as LeafMap,
  Marker,
  marker,
} from 'leaflet';
import 'proj4leaflet';
import { findAncestorWithAttribute } from '../../../app.util';
import {
  blueToolSymbol,
  getToolMarker,
  getToolMarkerIcon,
  yellowToolSymbol,
} from '../../../shared/marker';
import {
  getPositionFromEvent,
  SharedEventEffectService,
} from '../../../shared/shared.event.effect';
import {
  getWavePointIcon,
  getWavePointMarker,
} from '../../../shared/wave-point';
import { eventOnMapVisibilityFilter } from '../occ.const';
import { diffEvents } from './diff.util';
import { MetroLine as OccMetroLine } from './metro.line.class';
interface LocationEventDto {
  type?: string;
  position: LatLngExpression;
  positionString: string;
  meta: ExtremeOcc.Event;
}
interface MarkerMapArrayItem {
  marker?: Marker;
  data: LocationEventDto[];
  positionString: string;
  removed?: LocationEventDto[];
  added?: LocationEventDto[];
  changed?: LocationEventDto[];
  removeOrAdd?: number;
}

const NORMAL_EVENT_SHINNING_COLOR = '#38bdf8';
const SEVERITY_EVENT_SHINNING_COLOR = 'rgba(229, 0, 119, 1)';

export const DETAIL_CHANGE_REPAIR_STATE_ATTR = 'detail-change-repair-state';
export const DETAIL_ON_LIST_CHANGE_REPAIR_STATE_ATTR =
  'detail-on-list-change-repair-state';
export const COMPOSE_LIST_BOX_CLICK_ATTR = 'compose-list-box-click';
const boxItemTextAttr = `${COMPOSE_LIST_BOX_CLICK_ATTR}-item-text`;

const symbolPrefix = 'assets/images/occ/map/';
const symbol = symbolPrefix + 'hexagon-maker-event.png';
// const normalSymbol = symbolPrefix + 'normal-event-marker.png';
// const repairSymbol = symbolPrefix + 'important-event-marker.png';
const composeDetailBoxSymbol =
  symbolPrefix + 'detail-event-box-without-tail.png';

const composeMarkerSizeMap = [
  { scale: 0, offset: 0 }, // 09
  { scale: 0.3, offset: 0 }, // 10
  { scale: 0.5, offset: 0 }, // 11
  { scale: 0.5, offset: 20 }, // 12
  { scale: 0.75, offset: 35 }, // 13
  { scale: 1, offset: 40 }, // 14
  { scale: 1, offset: 45 }, // 15
  { scale: 1, offset: 45 }, // 16
];

@Injectable({
  providedIn: 'root',
})
export class OccMapEventEffectService extends SharedEventEffectService {
  initiated = false;
  map!: LeafMap;
  lineModels: OccMetroLine[] = [];
  featureGroup = new FeatureGroup([]);

  dataWithMarker: MarkerMapArrayItem[] = [];

  visible = true;

  get singleList() {
    return this.dataWithMarker.filter((d) => d.data.length === 1);
  }
  get composeList() {
    return this.dataWithMarker.filter((d) => d.data.length > 1);
  }
  detailPopUpBox?: { data: LocationEventDto; marker: Marker };
  detailListPopUpBox?: { data: LocationEventDto[]; marker: Marker };
  composeItemDetailPopUpBox?: { data: LocationEventDto; marker: Marker };

  events: ExtremeOcc.Event[] = [];

  // constructor(private occEventBusService: OccEventBusService) {}

  findTargetDataWithMarkerWithId(evId: string) {
    return this.dataWithMarker.find((d) =>
      d.data.find((dto) => dto.meta.id === evId),
    );
  }
  findTargetDataWithMarkerWithPosition(s: string) {
    return this.dataWithMarker.find((d) => d.positionString === s);
  }
  getLocationEventDto(ev: ExtremeOcc.Event, lineModel: OccMetroLine) {
    const position = getPositionFromEvent(ev, lineModel) || [];
    return {
      position: position as LatLngExpression,
      positionString: position.join(', '),
      meta: ev,
    };
  }

  setVisibility(visible: boolean) {
    this.visible = visible;
    if (!this.visible) {
      this.hideEffect();
    } else {
      this.revertEffect();
    }
  }

  mount(map: LeafMap, lineModels: OccMetroLine[]) {
    this.map = map;
    this.lineModels = lineModels;
    this.featureGroup.addTo(this.map);
    map.on('zoomend', (ev) => {
      this.onMapZoom(ev);
    });
    map.on('click', (ev) => {
      this.onMapClick(ev);
    });
  }
  onMapZoom(event: LeafletEvent) {
    const zoom = this.map.getZoom();
    this.dataWithMarker.forEach((e) => {
      const { marker } = e;
      if (!marker) return;
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
        const { scale } = this.getComposeMarkerSize(this.map.getZoom());
        marker.setIcon(this.getSingleMarkerIcon(e.data[0], scale, zoom, false));
      }
    });
  }
  onMapClick(event: LeafletEvent) {
    this.removeDetailPopUpBox();
    this.removeDetailListPopUpBox();
    this.removeComposeItemDetailPopUpBox();
  }

  showEffect() {
    // const zoom = this.map.getZoom();
    this.clearEffect();
    this.renderAndSetMarkers();
    // this.renderComposeMarkers();
    // this.effectSingleArray();
  }

  initializeEvents(evs: ExtremeOcc.Event[]) {
    this.initiated = true;
    // 过滤掉不显示的事件
    this.events = evs.filter(eventOnMapVisibilityFilter);
    this.dataWithMarker = [];
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
    Array.from(map).forEach(([posString, item]) => {
      this.dataWithMarker.push({
        data: item,
        positionString: posString,
      });
    });
  }
  diffEventsAndEffect(evs: ExtremeOcc.Event[]) {
    if (!this.initiated) return;
    const shouldShowEvs = evs.filter(eventOnMapVisibilityFilter);
    // 过滤掉不显示的事件
    const diffResult = diffEvents(shouldShowEvs, this.events);
    const { added, removed, changed } = diffResult;
    this.markRemoved(removed);
    this.markAdded(added);
    this.markChanged(changed);

    this.updateMarkerAccordingToDiff();
    this.events = shouldShowEvs;
    // this.clearEffect();
    // this.initializeEvents(evs);
    // this.showEffect();
  }
  markAdded(evs: ExtremeOcc.Event[]) {
    evs.forEach((ev) => {
      const lineModel = this.lineModels.find((l) => l.meta.name === ev.line);
      const locationDto = this.getLocationEventDto(ev, lineModel!);
      const target = this.findTargetDataWithMarkerWithPosition(
        locationDto.positionString,
      );
      if (target) {
        // target.data.push(locationDto);
        // target.modify = (target.modify || 0) + 1;
        // TODO mark to modify marker
        target.added = [...(target.added || []), locationDto];
        target.removeOrAdd = (target.removeOrAdd || 0) + 1;
      } else {
        const newItem: MarkerMapArrayItem = {
          positionString: locationDto.positionString,
          data: [], // ! Empty data is important
          added: [locationDto],
          removeOrAdd: 1,
        };
        this.dataWithMarker.push(newItem);

        // TODO mark to add marker
      }
    });
  }
  markRemoved(evs: ExtremeOcc.Event[]) {
    evs.forEach((ev) => {
      this.removePopupBoxIfEventRemoved(ev);
      const lineModel = this.lineModels.find((l) => l.meta.name === ev.line);
      const locationDto = this.getLocationEventDto(ev, lineModel!);
      const target = this.findTargetDataWithMarkerWithPosition(
        locationDto.positionString,
      );
      if (target) {
        // target.data = target.data.filter((d) => d.meta.id !== ev.id);
        // target.modify = (target.modify || 0) - 1;
        // TODO mark to update marker
        target.removed = [...(target.removed || []), locationDto];
        target.removeOrAdd = (target.removeOrAdd || 0) - 1;
      }
    });
  }
  markChanged(changed: ExtremeOcc.EventChange[]) {
    changed.forEach((c) => {
      if (c.changes['urgentRepair'] || c.changes['severity']) {
        const target = this.findTargetDataWithMarkerWithId(c.id);
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
    this.dataWithMarker.forEach((d) => {
      if (!d.removed && !d.added && !d.changed) return;

      this.renderOrUpdateDataWithMarker(d);

      d.added = undefined;
      d.removed = undefined;
      d.changed = undefined;
      d.removeOrAdd = undefined;
    });
    this.dataWithMarker = this.dataWithMarker.filter((d) => d.data.length);
  }

  attachModify(d: MarkerMapArrayItem) {
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

  renderOrUpdateDataWithMarker(d: MarkerMapArrayItem) {
    const previousCount = d.data.length;
    const currentCount = previousCount + (d.removeOrAdd || 0);
    if (currentCount === 0) {
      // 这个位置之前有数据，现在没有数据
      d.marker?.remove();
      d.marker = undefined;
      if (d.data.length === 1) {
        // 之前只有一个, 现在没了
        this.removePopupBoxIfEventRemoved(d.data[0].meta);
        this.clearEffectWithItem(d);
        this.attachModify(d);
      } else {
        // 之前有多个，现在没了
        this.attachModify(d);
      }
      return;
    }

    if (currentCount === 1) {
      // 之前有多个，现在只有一个
      this.attachModify(d);
      this.renderDegrade(d);
      return;
    }

    if (currentCount > 1) {
      // 之前有多个，现在有多个
      this.attachModify(d);
      this.renderUpgrade(d);
      return;
    }

    if (previousCount === 0) {
      // 这个位置之前没有数据，现在有数据
      this.rerender(d);
      return;
    }
  }
  renderUpgrade(d: MarkerMapArrayItem) {
    d.marker?.remove();
    d.marker = undefined;
    if (this.detailPopUpBox?.data.meta.id === d.data[0].meta.id) {
      this.removeDetailPopUpBox();
    }
    this.renderComposeItem(d);
    this.clearEffectWithItem(d);
  }

  renderDegrade(d: MarkerMapArrayItem) {
    d.marker?.remove();
    d.marker = undefined;
    // if (this.detailListPopUpBox?.data[0].positionString === d.positionString) {
    //   const detailItemId = this.composeItemDetailPopUpBox?.data.meta.id;
    //   if (detailItemId) {
    //     if (
    //       this.detailListPopUpBox.data
    //         .map((d) => d.meta.id)
    //         .includes(detailItemId)
    //     ) {
    //       this.removeComposeItemDetailPopUpBox();
    //     }
    //   }
    //   this.removeDetailListPopUpBox();
    // }
    this.removePopupBoxIfEventRemoved(d.data[0].meta);
    this.clearEffectWithItem(d);
    this.effectSingle(d);
  }
  rerender(d: MarkerMapArrayItem) {
    d.marker?.remove();
    d.marker = undefined;
    if (d.data.length === 1) {
      this.effectSingle(d);
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
  hide() {
    this.featureGroup.clearLayers();
    this.removeDetailPopUpBox();
    this.clearSingleArrayEffect();
  }
  hideEffect() {
    this.hide();
  }

  revert() {
    this.dataWithMarker.forEach((e) => {
      e.marker && this.featureGroup.addLayer(e.marker);
      if (e.data.length === 1 && !e.data[0].meta.urgentRepair) {
        this.effectSingleOnLine(e.data[0]);
      }
    });
  }

  revertEffect() {
    if (!this.visible) return;
    this.revert();
  }

  clearMakers() {
    this.featureGroup.clearLayers();
    // this.dataWithMarker = [];
  }
  clearEffect() {
    this.clearSingleArrayEffect();
    this.clearMakers();
  }

  effectSingleArray(simpleList: MarkerMapArrayItem[]) {
    simpleList.forEach((s) => {
      this.effectSingle(s);
    });
  }

  effectSingle(item: MarkerMapArrayItem) {
    const { scale } = this.getComposeMarkerSize(this.map.getZoom());
    const dto = item.data[0];
    if (dto.meta.urgentRepair || dto.meta.locationType === '区间') {
      const marker = this.getSingleMarker(dto, scale);
      if (this.visible) {
        this.featureGroup.addLayer(marker);
      }
      item.marker = marker;
    } else {
      if (this.visible) {
        this.effectSingleOnLine(dto);
      }
    }
  }
  clearSingleArrayEffect() {
    this.singleList.forEach((d) => {
      if (!d.data[0].meta.urgentRepair) {
        this.clearSingleEffectOnLine(d.data[0]);
      }
    });
  }
  effectSingleOnLine(ev: LocationEventDto) {
    const lineModel = this.lineModels.find((l) => l.meta.name === ev.meta.line);
    if (!ev.meta.customPosition) {
      const stationModel = lineModel?.findStationByName(ev.meta.startStation);
      stationModel?.shining({
        color:
          ev.meta.severity === 0
            ? NORMAL_EVENT_SHINNING_COLOR
            : SEVERITY_EVENT_SHINNING_COLOR,
      });
      stationModel?.addClickHandler(() => {
        this.toggleDetailPopUpBox(ev);
      });
    }
  }
  clearEffectWithItem(d: MarkerMapArrayItem) {
    this.clearSingleEffectOnLine(d.data[0]);
  }
  clearSingleEffectOnLine(ev: LocationEventDto) {
    const lineModel = this.lineModels.find((l) => l.meta.name === ev.meta.line);
    if (!ev.meta.customPosition) {
      const stationModel = lineModel?.findStationByName(ev.meta.startStation);
      stationModel?.stopShining();
      stationModel?.clearClickHandler();
    }
  }
  renderAndSetMarkers() {
    this.effectSingleArray(this.singleList);
    this.renderComposeMarkers(this.composeList);
  }
  renderComposeMarkers(composeList: MarkerMapArrayItem[]) {
    composeList.forEach((c) => {
      this.renderComposeItem(c);
    });
  }
  renderComposeItem(c: MarkerMapArrayItem) {
    const marker = this.getComposeMarker(c.data);
    if (this.visible) {
      this.featureGroup.addLayer(marker);
    }
    c.marker = marker;
  }
  getComposeMarkerSize(zoom: number) {
    const minZoom = 9;
    return composeMarkerSizeMap[zoom - minZoom] || { scale: 0, offset: 0 };
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
  getSingleMarkerIcon(
    event: LocationEventDto,
    scale = 1,
    zoom = 10,
    animation: boolean = true,
  ) {
    const { meta } = event;
    const needUrgentRepair = meta.urgentRepair;
    if (needUrgentRepair) {
      return getToolMarkerIcon(
        meta.severity === 0 ? blueToolSymbol : yellowToolSymbol,
        scale,
        animation,
      );
    }
    return getWavePointIcon(
      meta.severity === 1
        ? SEVERITY_EVENT_SHINNING_COLOR
        : NORMAL_EVENT_SHINNING_COLOR,
      zoom,
    );
  }
  getSingleMarker(event: LocationEventDto, scale = 0) {
    const { position, meta } = event;
    const needUrgentRepair = meta.urgentRepair;
    if (needUrgentRepair) {
      return getToolMarker({
        position,
        scale,
        symbol: meta.severity === 0 ? blueToolSymbol : yellowToolSymbol,
        clickCallback: (ev) => this.toggleDetailPopUpBox(event),
      });
    }
    return getWavePointMarker({
      color:
        meta.severity === 1
          ? SEVERITY_EVENT_SHINNING_COLOR
          : NORMAL_EVENT_SHINNING_COLOR,
      position,
      zoom: this.map!.getZoom(),
      clickCallback: (ev) => this.toggleDetailPopUpBox(event),
    });
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
    const m = this.getDetailPopUpBox(data, true);
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
    const m = this.getDetailPopUpBox(data, true, {
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
}
