import { Component, ElementRef, ViewChild } from '@angular/core';
import { LayerGroup, Map, geoJson } from 'leaflet';
import 'proj4leaflet';
import shpjs from 'shpjs';
import { MetroLine } from '../../../case-detail/services/classes/metro.line.class';
import { MapService } from '../../../case-detail/services/map.service';
import { MetroService } from '../../../case-detail/services/metro.service';
import { DarkModeSvgComponent } from '../../../dark-mode.svg/dark-mode.svg.component';

@Component({
  selector: 'digital-preplan-lines',
  imports: [DarkModeSvgComponent],
  templateUrl: './lines.component.html',
  styleUrl: './lines.component.less',
})
export class LinesComponent {
  @ViewChild('mapRef') mapRef?: ElementRef;

  map?: Map;
  lineModels: MetroLine[] = [];

  lineLayerGroup: LayerGroup = new LayerGroup([]);
  stationLayerGroup: LayerGroup = new LayerGroup([]);

  constructor(
    private readonly mapService: MapService,
    private readonly metro: MetroService,
  ) {}
  async ngAfterViewInit() {
    await this.initMap();
    this.metro.clearStationsCache();
    await this.initMetro();
  }
  async initMap() {
    this.map = this.mapService.getMapWithOptions(this.mapRef!.nativeElement, {
      center: [31.2, 121.5],
      zoom: 11,
    });
    // this.__TEMP_MAP_CLICK();
    this.map.doubleClickZoom.disable();
    this.lineLayerGroup.addTo(this.map);
    this.stationLayerGroup.addTo(this.map);
    await this.getRegion();
  }
  async initMetro() {
    const { lines } = this.metro.getMetroData();
    this.lineModels = lines.map((lineData) => {
      return this.metro.getLineModel(lineData);
    });
    this.lineModels.forEach((lineModel) => {
      lineModel.mount([this.lineLayerGroup, this.stationLayerGroup], this.map!);
    });
    this.metro.setModels(this.lineModels);
    // setTimeout(() => {
    this.metro.show();
    // });
  }
  async getRegion() {
    // window.location.origin
    const geojson = await shpjs(
      window.location.origin + '/assets/shape/Shanghai-2020.zip',
    );
    var geo = geoJson(geojson, {
      style: {
        color: '#00CFF8',
        weight: 3,
        opacity: 0.65,
        fillOpacity: 0,
      },
    });
    geo.addTo(this.map!);
  }
}
