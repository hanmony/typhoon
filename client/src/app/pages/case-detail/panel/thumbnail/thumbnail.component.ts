import {
  Component,
  ElementRef,
  Input,
  SimpleChanges,
  ViewChild,
} from '@angular/core';
import { lineString } from '@turf/turf';
import { map as LeafletMap, Polyline, polyline } from 'leaflet';
import 'proj4leaflet';
import { GuideMapService } from '../../../guide/guide-map.service';
import { Typhoon } from '../../services/classes/typhoon.class';
import { ITyphoonData } from '../../services/meta';

@Component({
  selector: 'panel-thumbnail',
  imports: [],
  templateUrl: './thumbnail.component.html',
  styleUrl: './thumbnail.component.less',
})
export class ThumbnailComponent {
  @Input() data?: ITyphoonData;
  map?: L.Map;
  lineLayer?: Polyline;
  typhoonModel?: Typhoon;
  @Input() mainTyphoonModel?: Typhoon;
  @ViewChild('thumbnailRef') thumbnailRef?: ElementRef;

  constructor(private mapService: GuideMapService) {}
  async ngAfterViewInit() {
    this.initMap();
    await this.renderProvincialRegions();
  }
  ngOnChanges(changes: SimpleChanges) {
    if (changes['data']) {
      this.generateTyphoonLine();
      this.generateTyphoon();
    }
  }
  initMap() {
    this.map = LeafletMap(this.thumbnailRef?.nativeElement, {
      ...this.mapService.getLeafletOptions(),
      center: [30.0146484375, 127.551757812],
      zoom: 4,
      minZoom: 4,
      maxZoom: 4,
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
  generateTyphoonLine() {
    if (!this.data?.states?.length) return;
    if (this.lineLayer) {
      this.lineLayer.remove();
      this.lineLayer = undefined;
    }
    const lines = lineString(this.data.states.map((e) => e.center));
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
  generateTyphoon() {
    if (this.typhoonModel) {
      this.typhoonModel.unmount(this.map!);
      this.typhoonModel = undefined;
    }
    if (!this.data) return;
    this.typhoonModel = new Typhoon({
      meta: this.data,
      omitLine: true,
      centerIconSize: 20,
    });
    this.typhoonModel.mount(this.map!);
    this.typhoonModel?.moveOut();
    if (this.mainTyphoonModel) {
      this.typhoonModel.followState(this.mainTyphoonModel);
    }
  }
}
