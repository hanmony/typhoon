import {
  Component,
  ElementRef,
  input,
  output,
  signal,
  ViewChild,
} from '@angular/core';
import { geoJson, LatLngExpression, LayerGroup, Map } from 'leaflet';
import 'proj4leaflet';
import shp from 'shpjs';
import { getPositionFromEvent } from '../../../../shared/shared.event.effect';
import {
  AnimationFrame,
  Typhoon,
} from '../../../case-detail/services/classes/typhoon.class';
import {
  ITyphoonState,
  linesData2026,
} from '../../../case-detail/services/meta';
import { OccMapEventEffectService } from '../../../occ/map/event.effect.occ.service';
import { OccLandingService } from '../../../occ/map/landing.effect.service';
import { OccMapLocateService } from '../../../occ/map/locate.occ.service';
import { MetroLine as CoccMetroLine } from '../../../occ/map/metro.line.class';
import { clearGlobalStationToLineMap } from '../../../occ/map/metro.station.class';
import { OccMapOperationEffectService } from '../../../occ/map/operation.effect.occ.service';
import { OccTyphoonService } from '../../../occ/map/typhoon.occ.service';
import { OccEventType } from '../../../occ/occ.event-bus.model';
import { OccEventBusService } from '../../../occ/occ.event-bus.service';
import { MapService } from './../../../case-detail/services/map.service';
import { DarkModeSvgComponent } from './../../../dark-mode.svg/dark-mode.svg.component';

const initialCenter: LatLngExpression = [31.15, 121.42];
const initialZoom = 10;

@Component({
  selector: 'cocc-map',
  imports: [DarkModeSvgComponent],
  templateUrl: './map.component.html',
  styleUrl: './map.component.less',
})
export class CoccMapComponent {
  @ViewChild('mapRef') mapRef!: ElementRef<HTMLDivElement>;

  onMapClick = output();

  events = input<ExtremeOcc.Event[]>([]);
  operations = input<ExtremeOcc.Operation[]>([]);

  cacheLines = signal<string[]>(linesData2026.map((l) => l.name));
  map?: Map;
  lineModels: CoccMetroLine[] = [];
  lineLayerGroup: LayerGroup = new LayerGroup([]);
  stationLayerGroup: LayerGroup = new LayerGroup([]);

  typhoonModel: Typhoon;
  cacheFTyphoonFrame?: AnimationFrame;
  windCircleVisible = false;

  customLocateMode = false;

  updateTyphoonPosition$ = this.occEventBusService.on(
    OccEventType.UPDATE_TYPHOON_POSITION,
  );

  constructor(
    private mapService: MapService,
    private eventService: OccMapEventEffectService,
    private operationService: OccMapOperationEffectService,
    private occEventBusService: OccEventBusService,
    private locateService: OccMapLocateService,
    private typhoonService: OccTyphoonService,
    private landingService: OccLandingService,
  ) {
    this.typhoonModel = new Typhoon({
      meta: {
        name: '',
        year: 2025,
        states: [],
      },
      omitLine: false,
      onStateUpdate: this.onTyphoonStateUpdate.bind(this),
    });
    this.updateTyphoonPosition$.subscribe(
      ({ frame, previousStates, forecastStates }) => {
        this.updateTyphoonPosition(frame);
        this.updateTyphoonPath(previousStates);
        this.updateTyphoonForecastPath(forecastStates);
        this.landingService.tryToEffectPredictLanding();
      },
    );
  }
  ngAfterViewInit() {
    this.map = this.mapService.getMapWithOptions(this.mapRef.nativeElement, {
      center: initialCenter,
      zoom: initialZoom,
    });
    this.mapService.zoomFallback(this.map);
    this.lineLayerGroup.addTo(this.map);
    this.stationLayerGroup.addTo(this.map);
    this.attachClickEvent();
    this.locateService.mount(this.map);
    this.getRegion();
    this.mountTyphoon();
    this.landingService.mount(this.map!);

    this.map.on('click', (e) => {
      this.onMapClick.emit();
    });
  }
  mountTyphoon() {
    this.map && this.typhoonModel.mount(this.map);
    this.typhoonService.mount(this.typhoonModel);
    const current = this.typhoonService.getCurrentTyphoonFrame();
    if (current?.frame) {
      this.updateTyphoonPosition(current.frame);
    }
  }
  updateTyphoonPosition(frame: AnimationFrame) {
    this.typhoonModel.updateLayersWithFrame(frame);
  }
  updateTyphoonPath(previousStates: ITyphoonState[]) {
    this.typhoonModel.updateLineLayer(previousStates.map((s) => s.center));
  }
  updateTyphoonForecastPath(forecastStates: ITyphoonState[]) {
    this.typhoonModel.updateForecastLineLayer(
      forecastStates.map((s) => s.center),
    );
  }
  onWindCircleChange(v: boolean) {
    this.windCircleVisible = v;
    this.typhoonModel?.setWindCircleVisible(!v);
  }
  locateEvent(ev: ExtremeOcc.Event) {
    const model = this.lineModels.find((l) => l.name === ev.line);
    if (model) {
      const coord = getPositionFromEvent(ev, model);
      if (coord) {
        this.mapService.viewCoord(coord, 14);
      }
    }
  }

  attachClickEvent() {
    this.map?.on('click', (e) => {
      if (this.customLocateMode) {
        this.occEventBusService.dispatch({
          type: OccEventType.CUSTOM_LOCATE,
          payload: e.latlng,
        });
      }
    });
  }
  async getRegion() {
    const geojson = await shp(
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

    setTimeout(() => {
      this.initMetro();
      this.eventService.mount(this.map!, this.lineModels);
      this.operationService.mount(this.map!, this.lineModels);
      this.effectEvent();
      this.effectOperation();
      this.mapService.setDetailBoundaryPolygon();
    }, 200);
  }
  async initMetro() {
    if (!this.lineModels.length) {
      const lines = linesData2026;
      this.lineModels = lines.map((lineData) => {
        return new CoccMetroLine({
          meta: lineData,
          eventBus: this.occEventBusService,
        });
      });
      this.stationLayerGroup.setZIndex(800);
      this.lineLayerGroup.setZIndex(100);
      this.lineModels.forEach((l) =>
        l.mount([this.lineLayerGroup, this.stationLayerGroup], this.map!),
      );
    }
  }
  effectEvent() {
    if (this.lineModels.length) {
      this.eventService.initializeEvents(this.events());
    }
    this.eventService.showEffect();
  }

  effectOperation() {
    this.operationService.showEffect();
  }

  onTyphoonStateUpdate() {}
  onLineChange(lines: string[]) {
    this.cacheLines.set(lines);
    this.lineModels.forEach((l) => {
      l.detachStations();
    });
    clearGlobalStationToLineMap();

    this.lineModels.forEach((l) => {
      if (lines.includes(l.meta.name)) {
        l.attachLine();
      } else {
        l.detachLine();
      }
    });
    this.lineModels
      .filter((l) => lines.includes(l.name))
      .forEach((l) => l.attachStations());
  }
  onLocate(type: number, line: string) {
    this.eventService.hideEffect();
    this.operationService.temporaryHideEffect();
    if (type === 3) {
      this.customLocateMode = true;
    } else {
      this.lineModels.forEach((l) => {
        l.setLocateMode(type);
        l.detachStations();
        l.detachLine();
      });
      clearGlobalStationToLineMap();
      this.lineModels.forEach((l) => {
        if (l.name === line) {
          l.attachLine();
          l.attachStations();
        }
      });
    }
  }
  terminateLocate(line: string) {
    this.eventService.revertEffect();
    this.operationService.revertTemporaryEffect();
    const lines = this.cacheLines();
    this.lineModels.forEach((l) => {
      l.setLocateMode(0);
      l.detachStations();
      l.detachLine();
    });
    clearGlobalStationToLineMap();
    this.lineModels.forEach((l) => {
      if (lines.includes(l.name)) {
        l.attachLine();
        l.attachStations();
      }
    });
    this.customLocateMode = false;
  }
  clearLocateIcons() {
    this.locateService.removeAllLocationIcons();
  }
}
