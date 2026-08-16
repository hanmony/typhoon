import { Component, ElementRef, Input, ViewChild } from '@angular/core';
import { lineString } from '@turf/turf';
import { map as LeafletMap, Polyline, polyline } from 'leaflet';
import 'proj4leaflet';
import { CaseDto } from '../../../../../domain/case.dto';
import { ApiService } from '../../../../../services/api.service';
import { Typhoon } from '../../../../case-detail/services/classes/typhoon.class';
import {
  ITyphoonData,
  transferPathInfosToTyphoonMeta,
} from '../../../../case-detail/services/meta';
import { GuideMapService } from '../../../../guide/guide-map.service';

@Component({
  selector: 'typhoon-card-shortcut',
  imports: [],
  templateUrl: './shortcut.component.html',
  styleUrl: './shortcut.component.less',
})
export class ShortcutComponent {
  @Input() typhoonMeta?: ITyphoonData;
  @Input() detailInfo!: CaseDto;
  map?: L.Map;
  lineLayer?: Polyline;
  typhoonModel?: Typhoon;
  @Input() mainTyphoonModel?: Typhoon;
  @ViewChild('shortcutRef') shortcutRef?: ElementRef;

  constructor(
    private apis: ApiService,
    private mapService: GuideMapService,
  ) {}
  async ngAfterViewInit() {
    const pathInfos = await this.apis.manager.getPathInfos(
      this.detailInfo.name,
    );
    this.typhoonMeta = transferPathInfosToTyphoonMeta(
      pathInfos,
      this.detailInfo,
    );
    this.initMap();
    await this.renderProvincialRegions();
    this.generateTyphoonLine();
  }
  initMap() {
    this.map = LeafletMap(this.shortcutRef?.nativeElement, {
      ...this.mapService.getLeafletOptions(),
      center: [31.2451171875, 124.27734375],
      zoom: 3,
      minZoom: 3,
      maxZoom: 3,
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
    if (!this.typhoonMeta?.states?.length) return;
    if (this.lineLayer) {
      this.lineLayer.remove();
      this.lineLayer = undefined;
    }
    const lines = lineString(this.typhoonMeta.states.map((e) => e.center));
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
}
