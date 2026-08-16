import { Injectable } from '@angular/core';
import {
  Feature,
  Position,
  Properties,
  booleanCrosses,
  booleanPointInPolygon,
  lineString,
  polygon,
} from '@turf/turf';
import {
  LatLngExpression,
  LeafletEvent,
  Map,
  Proj,
  TileLayer,
  map,
  tileLayer,
  type MapOptions,
} from 'leaflet';
import shp from 'shpjs';

import 'proj4leaflet';
import { Subject, max } from 'rxjs';
import { environment as env } from '../../../../environments/environment';

// const baseCenterPoint: LatLngExpression = [31.22, 121.49];
const baseCenterPoint: LatLngExpression = [31.075, 121.63];
// 31.05423, 121.629639
const centerOffset = [-0.01, 0.24];
const autoplayOffset = [-0.05, 0.15];
const centerPoint: LatLngExpression = [
  baseCenterPoint[0] + centerOffset[0],
  baseCenterPoint[1] + centerOffset[1],
];

const boundary: Position[] = [
  [31.404419, 121.234131],
  [31.414032, 121.335754],
  [31.418152, 121.423645],
  [31.418152, 121.474457],
  [31.390686, 121.525269],
  [31.357727, 121.591187],
  [31.320648, 121.618652],
  [31.278076, 121.68457],
  [31.209412, 121.777954],
  [31.153107, 121.80954],
  [30.904541, 121.933136],
  [30.901794, 121.49231],
  [30.927887, 121.216278],
  [31.099548, 121.003418],
  [31.301422, 121.085815],
  [31.404419, 121.234131],
];
const boundaryPolygon = polygon([boundary]);
@Injectable({
  providedIn: 'root',
})
export class MapService {
  map?: Map;
  options: MapOptions = {};
  baseLayers: TileLayer[] = [];
  boundaryPolygon = boundaryPolygon;
  detailBoundaryPolygon?: Feature<any, Properties>;
  viewingRange = 0;
  viewingRangeForbidden = false;
  $viewingRangeForbidden = new Subject<boolean>();

  $detailBoundaryPolygonFetched = new Subject<Feature<any, Properties>>();
  constructor() {}
  isInBoundary(coord: number[]) {
    return booleanPointInPolygon(coord, this.boundaryPolygon);
  }
  booleanCrosses(coordStart: number[], coordEnd: number[]) {
    return booleanCrosses(
      lineString([coordStart, coordEnd]),
      this.boundaryPolygon,
    );
  }
  async setDetailBoundaryPolygon() {
    const geojson = await shp(
      window.location.origin + '/assets/shape/Shanghai-2020-simple.zip',
    );
    this.detailBoundaryPolygon = polygon(
      (geojson as any).features[0].geometry.coordinates.map((c) =>
        c.map((p) => p.slice().reverse()),
      ),
    );
    this.$detailBoundaryPolygonFetched.next(this.detailBoundaryPolygon);
  }
  setViewRangeForbidden(forbidden: boolean) {
    this.viewingRangeForbidden = forbidden;
    this.$viewingRangeForbidden.next(forbidden);
  }
  setViewingRange(range: number) {
    this.viewingRange = range;
    this.setStartAutoView();
  }
  getLeafletOptions() {
    const leafletOptions: MapOptions = {
      crs: new Proj.CRS('EPSG:4490', '+proj=longlat +ellps=GRS80 +no_defs', {
        resolutions: [
          1.40625, 0.703125, 0.3515625, 0.17578125, 0.087890625, 0.0439453125,
          0.02197265625, 0.010986328125, 0.0054931640625, 0.00274658203125,
          0.001373291015625, 6.866455078125e-4, 3.4332275390625e-4,
          1.71661376953125e-4, 8.58306884765625e-5, 4.291534423828125e-5,
          2.1457672119140625e-5, 1.0728836059570312e-5, 5.364418029785156e-6,
          2.682209064925356e-6, 1.3411045324626732e-6,
        ],
        origin: [-180, 90],
      }),
      center: centerPoint,
      zoom: 10,
      minZoom: 5,
      maxZoom: 16,
      zoomControl: false,
      maxBounds: [
        [32.10396, 124.260378],
        [30.014771, 119.99949],
      ],
      maxBoundsViscosity: 1,
    };
    return leafletOptions;
  }
  disableMoveAndZoom() {
    this.map?.scrollWheelZoom.disable();
    this.map?.dragging.disable();
  }
  setStartAutoView() {
    if (this.viewingRange) {
      this.setCityView();
    } else {
      this.setGlobalView();
    }
  }
  setGlobalView() {
    const targetCoord = [31.195, 121.461];
    const center = this.map?.getCenter();
    if (center?.alt !== targetCoord[0] || center?.lng !== targetCoord[1]) {
      this.followCoord(targetCoord, 9);
    }
  }
  setCityView() {
    const targetCoord = [31.195, 121.461];
    const center = this.map?.getCenter();
    if (center?.alt !== targetCoord[0] || center?.lng !== targetCoord[1]) {
      this.followCoord(targetCoord, 11);
    }
  }
  followCoord(coord: number[], zoom: number = 11) {
    if (!this.map) {
      return;
    }
    const curZoom = this.map.getZoom();
    if (curZoom !== zoom) {
      setTimeout(() => {
        this.map!.setZoom(zoom);
      }, 300);
    }
    setTimeout(() => {
      this.map!.panTo([
        coord[0] + autoplayOffset[0],
        coord[1] + autoplayOffset[1],
      ] as LatLngExpression);
    }, 600);
  }
  viewCoord(coord: number[], zoom: number = 11) {
    if (!this.map) {
      return;
    }
    const curZoom = this.map.getZoom();
    if (curZoom !== zoom) {
      setTimeout(() => {
        this.map!.setZoom(zoom);
      }, 300);
    }
    setTimeout(() => {
      this.map!.panTo([coord[0], coord[1]] as LatLngExpression);
    }, 600);
  }
  enableMoveAndZoom() {
    this.map?.scrollWheelZoom.enable();
    this.map?.dragging.enable();
  }
  getBaseLayers(): Record<string, TileLayer> {
    const url = `${env.mapUrl}/vec/{z}/{y}/{x}.png`;
    const url_c = `${env.mapUrl}/cva/{z}/{y}/{x}.png`;
    const vec = tileLayer(url, {
      // tileSize: 1024,
      detectRetina: true,
    });
    return {
      vec,
      cva: tileLayer(url_c, {
        // tileSize: 1024,
        detectRetina: true,
      }),
    };
  }
  getMap(dom: HTMLDivElement) {
    this.options = this.getLeafletOptions();
    const { vec, cva } = this.getBaseLayers();
    this.baseLayers = [vec, cva];
    this.map = map(dom, {
      ...this.options,
      layers: [vec, cva],
    });

    return this.map;
  }
  zoomFallback(map: Map) {
    let before = max;
    map.on('zoomstart', () => {
      // before = map.getZoom();
      this.zoomBeforeCache = map.getZoom();
    });
    map.off('zoomend', this.zoomendFallbackFn);
    map.on('zoomend', this.zoomendFallbackFn);
  }
  zoomBeforeCache = 9;
  zoomendFallbackFn(ev: LeafletEvent) {
    const map = ev.target;
    console.log(ev);
    const min = 5;
    const max = 9;
    const zoom = map.getZoom();
    console.log('zoomFallback', this.zoomBeforeCache, zoom);

    if (zoom < this.zoomBeforeCache) {
      if (zoom !== min && zoom < max) {
        map.setZoom(min);
      }
    } else {
      if (zoom > min && zoom < max) {
        map.setZoom(max);
      }
    }

    this.zoomBeforeCache = zoom;
  }
  getMapWithOptions(dom: HTMLDivElement, options: MapOptions) {
    this.options = this.getLeafletOptions();
    const { vec, cva } = this.getBaseLayers();
    this.baseLayers = [vec, cva];
    this.map = map(dom, {
      ...this.options,
      ...options,
      layers: [vec, cva],
    });
    return this.map;
  }
}

@Injectable({
  providedIn: 'root',
})
export class DashboardMapService extends MapService {}
