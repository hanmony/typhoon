import { computed, Injectable, signal } from '@angular/core';
import {
  divIcon,
  FeatureGroup,
  LatLng,
  LatLngExpression,
  Map,
  marker,
  Marker,
} from 'leaflet';
import 'proj4leaflet';
import { ILinePoint } from '../../case-detail/services/meta';
import { OccEventType } from '../occ.event-bus.model';
import { OccEventBusService } from './../occ.event-bus.service';

const symbolPrefix = 'assets/images/occ/map/';
const localIconSymbol = symbolPrefix + 'locate-icon.png';

interface CoordWithin {
  coord: LatLngExpression;
}
export interface LocationValueDto {
  startStation?: ILinePoint;
  endStation?: ILinePoint;
  customPosition?: string;
}

@Injectable({
  providedIn: 'root',
})
export class OccMapLocateService {
  map!: Map;
  featureGroup = new FeatureGroup([]);
  dataWithMarker: { data: CoordWithin; marker: Marker }[] = [];

  locationType = signal<number>(1);
  tempLocationValues = signal({
    startStation: '',
    endStation: '',
    customPosition: '',
  });
  isSingleStation = computed(() => this.locationType() === 1);
  isIntervalStation = computed(() => this.locationType() === 2);
  isCustomPosition = computed(() => this.locationType() === 3);
  isIntervalCustom = computed(() => this.locationType() === 4);

  isLocatingIntervalCustom = signal(false);

  stationLocate$ = this.occEventBusService.on(OccEventType.STATION_LOCATE);
  customLocate$ = this.occEventBusService.on(OccEventType.CUSTOM_LOCATE);
  // confirmLocate$ = this.occEventBusService.on(OccEventType.CONFIRM_LOCATE);

  constructor(private occEventBusService: OccEventBusService) {
    this.stationLocate$.subscribe((station) => {
      this.afterStationLocate(station);
    });
    this.customLocate$.subscribe((coord) => {
      this.afterCustomLocate(coord);
    });
  }

  mount(map: Map) {
    this.map = map;
    this.featureGroup.addTo(this.map);
  }

  setLocationType(type: number, p?: LocationValueDto) {
    this.locationType.set(type);
    this.removeAllLocationIcons();
    const start = p?.startStation ? p.startStation.name || '' : '';
    const end = p?.endStation ? p.endStation.name || '' : '';
    this.tempLocationValues.set({
      startStation: start,
      endStation: start && end ? end : '',
      customPosition: '',
    });
    if (start) {
      this.setLocationIcon({
        coord: p!.startStation!.coord as LatLngExpression,
      });
      if (end) {
        this.setLocationIcon({
          coord: p!.endStation!.coord as LatLngExpression,
        });
        this.isLocatingIntervalCustom.set(true);
        this.queryToConfirm();
        return;
      }
    }
    this.disableConfirm();
  }
  disableConfirm() {
    this.occEventBusService.dispatch({
      type: OccEventType.DISABLE_CONFIRM,
      payload: null,
    });
  }

  setLocationIcon(data: CoordWithin) {
    const marker = this.getLocationIconMarker(data);
    this.featureGroup.addLayer(marker);
    this.dataWithMarker.push({ data: data, marker });
  }

  afterStationLocate(station: ILinePoint) {
    if (this.isSingleStation()) {
      this.afterLocateSingle(station);
    } else if (this.isIntervalStation() || this.isIntervalCustom()) {
      this.afterLocateInterval(station);
    }
  }
  afterLocateSingle(station: ILinePoint) {
    const values = this.tempLocationValues();
    if (values.startStation) {
      // 已经选了一个点，重新选择
      this.removeAllLocationIcons();
    }
    this.tempLocationValues.update((prev) => ({
      ...prev,
      startStation: station.name || '',
    }));
    this.setLocationIcon({ coord: [station.coord[0], station.coord[1]] });
    this.queryToConfirm();
  }
  afterLocateInterval(station: ILinePoint) {
    const values = this.tempLocationValues();
    if (!values.startStation) {
      // 还没有选起点，需要选择起点
      this.tempLocationValues.update((prev) => ({
        ...prev,
        startStation: station.name || '',
        endStation: '',
      }));
      this.setLocationIcon({ coord: [station.coord[0], station.coord[1]] });
      this.isLocatingIntervalCustom.set(false);
      this.disableConfirm();
    } else {
      if (values.endStation) {
        // 已经选了两个点，需要重新选择
        this.removeAllLocationIcons();
        this.tempLocationValues.update((prev) => ({
          ...prev,
          startStation: station.name || '',
          endStation: '',
        }));
        this.disableConfirm();
        this.isLocatingIntervalCustom.set(false);
        this.setLocationIcon({ coord: [station.coord[0], station.coord[1]] });
        return;
      }
      this.tempLocationValues.update((prev) => ({
        ...prev,
        endStation: station.name || '',
      }));
      this.isLocatingIntervalCustom.set(true);
      this.setLocationIcon({ coord: [station.coord[0], station.coord[1]] });
      this.queryToConfirm();
    }
  }
  afterCustomLocate(data: LatLng) {
    const values = this.tempLocationValues();
    if (values.customPosition) {
      // 已经选了一个点，重新选择
      this.removeLastLocationIcon();
    }
    const lat = this.toSixDecimal(data.lat);
    const lng = this.toSixDecimal(data.lng);
    this.tempLocationValues.update((prev) => ({
      ...prev,
      customPosition: `${lat}, ${lng}`,
    }));
    this.setLocationIcon({ coord: [lat, lng] });
    this.isLocatingIntervalCustom.set(false);
    this.queryToConfirm();
  }
  toSixDecimal(value: number) {
    return Number(value.toFixed(6));
  }

  queryToConfirm() {
    this.occEventBusService.dispatch({
      type: OccEventType.QUERY_TO_CONFIRM,
      payload: true,
    });
  }

  getLocationIconMarker(data: CoordWithin) {
    const m = marker(data.coord, {
      icon: divIcon({
        html: `<div class="w-full h-full relative animate__animated animate__fadeInDown">
        <img src="${localIconSymbol}" class="w-full h-full flex items-center justify-center"  />
      </div>`,
        className: 'hover-border',
        iconSize: [42, 51],
        iconAnchor: [21, 44],
      }),
    }) as Marker;
    return m;
  }

  removeAllLocationIcons() {
    this.dataWithMarker.forEach(({ marker }) => {
      marker.remove();
    });
    this.dataWithMarker = [];
  }
  removeLastLocationIcon() {
    const icon = this.dataWithMarker.pop();
    icon?.marker.remove();
  }
}
