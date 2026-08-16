import { Component, ElementRef, ViewChild } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { bezierSpline, lineString } from '@turf/turf';
import {
  map as LeafletMap,
  Map,
  MapOptions,
  Polyline,
  TileLayer,
  geoJson,
  icon,
  marker,
  polyline,
} from 'leaflet';
import 'proj4leaflet';
import shpjs from 'shpjs';
import { CaseDto } from '../../domain/case.dto';
import { LibraryNzModule } from '../../library.nz.module';
import { ApiService } from '../../services/api.service';
import { Typhoon } from '../case-detail/services/classes/typhoon.class';
import {
  ITyphoonData,
  transferPathInfosToTyphoonMeta,
} from '../case-detail/services/meta';
import { AlertType } from '../case-detail/services/utils.service';
import { getAnimationFrame } from '../case-detail/utils';
import { GetAnimationParams, NodeType, nodeTypePropertyMap } from './constant';
import { getAnimation } from './gsap';
import { GuideMapService } from './guide-map.service';
import { HeadlineComponent } from './headline/headline.component';
import { MilestonesComponent } from './milestones/milestones.component';
import { OverviewComponent } from './overview/overview.component';

const ANIMATION_DURATION = 5000;
const START_LINE_INDEX = 0;

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
  selector: 'app-guide',
  imports: [
    LibraryNzModule,
    HeadlineComponent,
    MilestonesComponent,
    OverviewComponent,
  ],
  templateUrl: './guide.component.html',
  styleUrl: './guide.component.less',
})
export class GuideComponent {
  zoom = 1;
  @ViewChild('mapRef') mapRef?: ElementRef;

  baseLayers: TileLayer[] = [];
  options: MapOptions = {};
  map?: Map;

  detailInfo?: CaseDto;
  typhoonMeta?: ITyphoonData;
  typhoonModel?: Typhoon;
  typhoonCurvedLine?: number[][];
  typhoonLineLayer?: Polyline;
  animation?: gsap.core.Timeline;
  animationFrameTimer?: number;
  animationFrameFunc = getAnimationFrame();
  graduallyAnimateLineStartTime: number = 0;
  graduallyAnimateLineEndTime: number = 0;
  cancelFlag = false;

  animationDone = false;
  constructor(
    private readonly route: ActivatedRoute,
    private readonly router: Router,
    private readonly apis: ApiService,
    private mapService: GuideMapService,
  ) {}
  async fetchCaseDetail(id: string) {
    const detail = await this.apis.manager.getCase(id);
    const pathInfos = await this.apis.manager.getPathInfos(detail.name);
    this.typhoonMeta = transferPathInfosToTyphoonMeta(pathInfos, detail);
    if (this.typhoonMeta && this.typhoonMeta.states.length) {
      this.typhoonModel = new Typhoon({
        meta: this.typhoonMeta,
        omitLine: true,
      });
      this.generateTyphoonLine();
      this.map && this.typhoonModel.mount(this.map);
      this.typhoonModel?.moveOut();
    }
    setTimeout(() => {
      this.detailInfo = detail;
      setTimeout(() => {
        this.animate();
      });
    }, 1000);
  }
  setZoom() {
    return new Promise((resolve) => {
      const w = document.documentElement.offsetWidth;
      setTimeout(() => {
        this.zoom = w / 1920;
        resolve(null);
      });
    });
  }
  async ngAfterViewInit() {
    // await this.setZoom();
    this.initMap();
    if (this.typhoonModel) {
      if (!this.typhoonModel?.hasMounted) {
        this.typhoonModel?.mount(this.map!);
      }
    }
    // this.getShanghaiRegion();
    this.getProvincialRegions().then();
    this.route.paramMap.subscribe((paramMap) => {
      const id = paramMap.get('id');
      if (id) {
        this.fetchCaseDetail(id);
      }
    });
  }
  initMap() {
    this.options = this.mapService.getLeafletOptions();
    // const { vec, cva } = this.mapService.getBaseLayers();
    // this.baseLayers = [vec, cva];
    this.map = LeafletMap(this.mapRef?.nativeElement, {
      ...this.options,
      layers: [],
    });
    this.map.scrollWheelZoom.disable();
    this.map.dragging.disable();
    this.map.doubleClickZoom.disable();
  }
  async getShanghaiRegion() {
    // window.location.origin
    const geojson = await shpjs(
      window.location.origin + '/assets/shape/Shanghai-2020.zip',
    );
    var geo = geoJson(geojson, {
      style: {
        color: '#1EA8FC',
        weight: 2,
        opacity: 0.65,
        fillOpacity: 0,
      },
    });
    geo.addTo(this.map!);
  }
  async getProvincialRegions() {
    // window.location.origin
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
  // generateTyphoonCurvedLine() {
  //   const lines = lineString(this.typhoonMeta!.states.map((e) => e.center));
  //   return bezierSpline(lines);
  // }
  generateTyphoonLine() {
    if (!this.typhoonMeta?.states?.length) return;
    const lines = lineString(this.typhoonMeta.states.map((e) => e.center));

    this.typhoonCurvedLine = expandCoordinates(
      bezierSpline(lines).geometry.coordinates,
      10000,
    ).filter((e) => !isNaN(e[0]) && !isNaN(e[1]));
    this.typhoonLineLayer = polyline([] as L.LatLngExpression[], {
      color: '#00CFF8',
      weight: 4,
      dashArray: [6, 7],
    });
    this.typhoonLineLayer.addTo(this.map!);
  }
  graduallyAnimateLine() {
    if (!this.typhoonMeta) return;
    this.graduallyAnimateLineStartTime = new Date().getTime();
    this.graduallyAnimateLineEndTime =
      this.graduallyAnimateLineStartTime + ANIMATION_DURATION;
    this.animateLineUpdate();
  }
  ngOnDestroy() {
    this.cancelAnimation();
  }
  animateLineUpdate() {
    this.animationFrameTimer = this.animationFrameFunc(
      this.animateLineUpdateEffect.bind(this),
    );
  }
  animateLineUpdateEffect() {
    const current = new Date().getTime();
    const rate =
      (current - this.graduallyAnimateLineStartTime) / ANIMATION_DURATION;
    if (rate > 1) {
      return this.cancelAnimation();
    }
    const latLngs = this.typhoonCurvedLine;
    if (!latLngs) {
      return;
    }
    const sliceIndex = Math.ceil((latLngs.length - START_LINE_INDEX) * rate);

    const slicedLatLngs = [
      ...latLngs.slice(0, START_LINE_INDEX),
      ...latLngs.slice(START_LINE_INDEX, sliceIndex + START_LINE_INDEX),
    ];

    this.typhoonLineLayer?.setLatLngs(slicedLatLngs as L.LatLngExpression[]);
    this.animateLineUpdate();
  }
  cancelAnimation() {
    if (this.animationFrameTimer) {
      window.cancelAnimationFrame(this.animationFrameTimer);
      this.animationFrameTimer = undefined;
    }
  }
  toFrontEndDetail() {
    this.route.paramMap.subscribe((paramMap) => {
      const id = paramMap.get('id');
      if (id) {
        this.router.navigate(['/case-detail', { id }]);
      }
    });
  }
  getMilestoneParams(): GetAnimationParams {
    return {
      generated: () => {
        !this.cancelFlag && this.graduallyAnimateLine();
      },
      'issued-alert': () => {
        // this.toFrontEndDetail();
        this.getMilestoneCallback('issued-alert');
      },
      'top-alert': () => {
        this.getMilestoneCallback('top-alert');
      },
      'lift-alert': () => {
        this.getMilestoneCallback('lift-alert');
        // this.toFrontEndDetail();
      },
      dissipate: () => {
        // this.toFrontEndDetail();
        this.getMilestoneCallback('dissipate');
      },
    };
  }
  getWeatherAlertTypeByText(message: string): AlertType {
    if (message.indexOf('蓝色') !== -1) {
      return 'blue';
    } else if (message.indexOf('黄色') !== -1) {
      return 'yellow';
    } else if (message.indexOf('橙色') !== -1) {
      return 'orange';
    } else if (message.indexOf('台风红色') !== -1) {
      return 'red';
    } else if (message.indexOf('逐级解除') !== -1) {
      return 'lift';
    } else {
      return 'unknown';
    }
  }
  getMilestoneCallback(key: NodeType) {
    const value = this.detailInfo!.values[nodeTypePropertyMap[key]]?.value;
    if (!value) {
      return;
    }
    const [d, message] = value.split('，');
    const date = new Date(d);
    const snapshot = this.typhoonModel?.getFrameByTime(date);
    const alertType = this.getWeatherAlertTypeByText(message);
    if (snapshot && alertType && alertType !== 'unknown') {
      const { center } = snapshot;
      // circle(center, {
      //   color: '#02B0D5',
      //   fillOpacity: 0,
      //   radius: 32000,
      //   weight: 1,
      //   stroke: true,
      // }).addTo(this.map!);
      marker(center, {
        icon: icon({
          iconSize: [38, 32],
          iconAnchor: [19, 16],
          iconUrl:
            'assets/images/map/marker/typhoon-alert-' + alertType + '.png',
        }),
      }).addTo(this.map!);
    } else {
      console.error('snapshot not found');
    }
  }

  animate() {
    this.animation = getAnimation(this.getMilestoneParams());
    this.animation.then(() => {
      this.animationDone = true;
    });
  }
  terminateAnimation() {
    if (this.animation) {
      this.animation.duration(0);
    }
    this.cancelAnimation();
    this.cancelFlag = true;
    this.animationDone = true;
    this.typhoonLineLayer?.setLatLngs(
      this.typhoonCurvedLine as L.LatLngExpression[],
    );
  }
  get level() {
    return this.detailInfo?.values['台风类型']?.value;
  }
}
