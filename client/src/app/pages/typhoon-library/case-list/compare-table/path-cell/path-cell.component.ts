import { Component, ElementRef, Input, ViewChild } from '@angular/core';
import { bezierSpline, lineString } from '@turf/turf';
import { map as LeafletMap, Map, geoJson, polyline } from 'leaflet';
import 'proj4leaflet';
import shpjs from 'shpjs';
import { MapService } from '../../../../case-detail/services/map.service';
import { ICompareItemData } from '../compare-table.component';

type Point = number[];

function generatePoints(point1: Point, point2: Point, total: number): Point[] {
  const x1 = point1[0];
  const y1 = point1[1];

  const x2 = point2[0];
  const y2 = point2[1];

  const xRange = x2 - x1;
  const yRange = y2 - y1;

  const points: Point[] = [];

  for (let i = 0; i < total; i++) {
    // 计算x坐标比例
    const ratio = i / (total - 1);
    const x = x1 + ratio * xRange;

    // 计算y坐标比例
    const y = y1 + ratio * yRange;

    points.push([x, y]);
  }

  return points;
}

function calculateDistance(point1: Point, point2: Point) {
  const xDistance = point2[0] - point1[0];
  const yDistance = point2[1] - point1[1];
  return Math.hypot(xDistance, yDistance);
}

function expandCoordinates(coordinates: number[][], targetLength: number) {
  const distances = coordinates.reduce((acc, cur, index, arr) => {
    const next = arr[index + 1];
    if (next) {
      const distance = calculateDistance(cur, next);
      acc.push(distance);
    }
    return acc;
  }, []);
  const total = distances.reduce((acc, cur) => acc + cur, 0);
  const expandNumbers = distances.map((distance) =>
    Math.floor((distance / total) * targetLength),
  );

  const result = coordinates.reduce((acc, cur, index) => {
    acc.push(cur);
    const expandNumber = expandNumbers[index];
    if (isNaN(expandNumber)) {
      return acc;
    }
    if (expandNumber) {
      acc.push(...generatePoints(cur, coordinates[index + 1], expandNumber));
    }
    return acc;
  }, [] as number[][]);
  return result;
}

@Component({
  selector: 'compare-path-cell',
  imports: [],
  templateUrl: './path-cell.component.html',
  styleUrl: './path-cell.component.less',
})
export class PathCellComponent {
  @Input() data!: ICompareItemData;
  @ViewChild('domRef') domRef?: ElementRef<HTMLDivElement>;

  map?: Map;
  constructor(private mapService: MapService) {}
  ngAfterViewInit() {
    this.initMap();
    if (this.data.typhoonInstance) {
      if (!this.data.typhoonInstance.hasMounted) {
        this.data.typhoonInstance.mount(this.map!);
      }
    }
    // this.getShanghaiRegion();
    this.getProvincialRegions().then(() => {
      this.generateTyphoonLine();
    });
  }
  initMap() {
    if (!this.domRef) return;
    this.map = LeafletMap(this.domRef?.nativeElement, {
      ...this.mapService.getLeafletOptions(),
      zoom: 5,
      minZoom: 5,
      maxZoom: 5,
      layers: [],
    });
    this.map.scrollWheelZoom.disable();
    this.map.dragging.disable();
    this.map.doubleClickZoom.disable();
  }
  async getProvincialRegions() {
    const geojson = await shpjs(
      window.location.origin +
        '/assets/shape/provincial-administration-regions-2020.zip',
    );
    // @ts-ignore
    const shanghaiGeojson = geojson.features.find(
      // @ts-ignore
      (f) => f.properties['省'] === '上海市',
    );

    if (shanghaiGeojson) {
      var shanghaiGeo = geoJson(shanghaiGeojson, {
        style: {
          color: '#018CF2',
          weight: 4,
          opacity: 1,
          fillColor: '#018CF2',
          fillOpacity: 1,
        },
      });
      shanghaiGeo.addTo(this.map!);
    }
    const transcripts = {
      ...geojson,
      // @ts-ignore
      features: geojson.features.filter(
        // @ts-ignore
        (f) => {
          const ignored = [
            '上海市',
            '中朝共有',
            '澳门特别行政区',
            '香港特别行政区',
          ];
          return !ignored.includes(f.properties['省']);
        },
      ),
    };
    var geo = geoJson(transcripts, {
      style: {
        color: '#1EA8FC',
        weight: 1,
        opacity: 1,
        fillOpacity: 0,
      },
    });
    geo.addTo(this.map!);
  }
  generateTyphoonLine() {
    if (!this.data.typhoonMeta?.states?.length) return;
    const lines = lineString(this.data.typhoonMeta.states.map((e) => e.center));

    const l = expandCoordinates(
      bezierSpline(lines).geometry.coordinates,
      10000,
    ).filter((e) => !isNaN(e[0]) && !isNaN(e[1]));
    const p = polyline(l as L.LatLngExpression[], {
      color: '#00CFF8',
      weight: 2,
      dashArray: [3, 4],
    });
    p.addTo(this.map!);
  }
}
