import { Component, ElementRef, Input, ViewChild } from '@angular/core';
import { lineString } from '@turf/turf';
import { map as LeafletMap, Polyline, polyline } from 'leaflet';
import 'proj4leaflet';
import { ITyphoonState } from '../../../case-detail/services/meta';
import { getTendencyKeyword } from '../../map/typhoon.occ.service';
import { OccEventType } from '../../occ.event-bus.model';
import { OccEventBusService } from '../../occ.event-bus.service';
import { ApiService } from './../../../../services/api.service';
import {
  AnimationFrame,
  Typhoon,
} from './../../../case-detail/services/classes/typhoon.class';
import { GuideMapService } from './../../../guide/guide-map.service';

const iconPrefix = '/assets/images/occ/';

@Component({
  selector: 'occ-weather-info',
  imports: [],
  templateUrl: './weather-info.component.html',
  styleUrl: './weather-info.component.less',
})
export class OccWeatherInfoComponent {
  @ViewChild('shortcutRef') shortcutRef?: ElementRef;
  map?: L.Map;
  lineLayer?: Polyline;
  typhoonModel?: Typhoon;
  @Input() mainTyphoonModel?: Typhoon;
  infos = [
    {
      title: '台风级别',
      value: '0级',
      icon: iconPrefix + 'typhoon-level-icon.png',
    },
    {
      title: '当前风力',
      value: '0m/s',
      icon: iconPrefix + 'typhoon-power-icon.png',
    },
    {
      title: '未来趋势',
      value: '?',
      icon: iconPrefix + 'typhoon-tendency-icon.png',
    },
    {
      title: '移动方向',
      value: '?',
      icon: iconPrefix + 'typhoon-direction-icon.png',
    },
  ];
  updateTyphoonPosition$ = this.occEventBusService.on(
    OccEventType.UPDATE_TYPHOON_POSITION,
  );

  constructor(
    private apis: ApiService,
    private occEventBusService: OccEventBusService,
    private mapService: GuideMapService,
  ) {
    this.updateTyphoonPosition$.subscribe(({ frame, previousStates }) => {
      this.updateThumbnail(frame, previousStates);
    });
  }

  async ngAfterViewInit() {
    this.initMap();
    await this.renderProvincialRegions();
    this.generateTyphoon();
    this.generateTyphoonLine(undefined);
  }

  updateThumbnail(frame: AnimationFrame, states: ITyphoonState[]) {
    this.typhoonModel?.updateLayersWithFrame({
      center: frame.center,
      radius: frame.radius,
    });
    this.generateTyphoonLine(states);
    const lastState = states[states.length - 1];
    this.fillInfos(lastState);
  }
  initMap() {
    this.map = LeafletMap(this.shortcutRef?.nativeElement, {
      ...this.mapService.getLeafletOptions(),
      center: [31.2451171875, 122.27734375],
      zoom: 5,
      minZoom: 5,
      maxZoom: 5,
      layers: [],
    });
    this.map.scrollWheelZoom.disable();
    this.map.dragging.disable();
    this.map.doubleClickZoom.disable();
  }
  async renderProvincialRegions() {
    const geo = await this.mapService.getProvincialRegions();
    geo.shanghai.addTo(this.map!);
    geo.cn.addTo(this.map!);
  }
  generateTyphoonLine(states: ITyphoonState[] | undefined) {
    if (!states?.[0]?.center?.length) return;
    if (this.lineLayer) {
      this.lineLayer.remove();
      this.lineLayer = undefined;
    }
    const lines = lineString(states.map((e) => e.center));
    this.lineLayer = polyline(
      lines.geometry.coordinates as L.LatLngExpression[],
      {
        color: '#00CFF8',
        weight: 2,
        dashArray: [3, 4],
      },
    );

    this.lineLayer.addTo(this.map!);
  }
  fillInfos(lastState: ITyphoonState) {
    const [typhoonLevel, typhoonPower, typhoonTendency, typhoonDirection] =
      this.infos;
    if (!lastState) return;
    typhoonLevel.value = lastState.level.toString() + '级' || '';
    typhoonPower.value = lastState.speed?.toString() + 'm/s' || '';
    typhoonTendency.value = getTendencyKeyword(lastState.tendency || '');
    typhoonDirection.value = lastState.direction || '';
  }

  generateTyphoon() {
    this.typhoonModel = new Typhoon({
      meta: {
        name: '',
        year: 0,
        states: [],
      },
      omitLine: true,
      centerIconSize: 20,
    });
    this.typhoonModel.mount(this.map!);
    this.typhoonModel?.moveOut();
  }
}
