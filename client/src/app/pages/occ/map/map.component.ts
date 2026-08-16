import { Component, ElementRef, Input, ViewChild } from '@angular/core';
import { geoJson, LatLngExpression, LayerGroup, Map } from 'leaflet';
import 'proj4leaflet';
import shp from 'shpjs';
import { ITyphoonState, linesData2026 } from '../../case-detail/services/meta';
import { OccEventType } from '../occ.event-bus.model';
import {
  AnimationFrame,
  Typhoon,
} from './../../case-detail/services/classes/typhoon.class';
import { MapService } from './../../case-detail/services/map.service';
import { WindCircleComponent } from './../../case-detail/timeline/wind-circle/wind-circle.component';
import { DarkModeSvgComponent } from './../../dark-mode.svg/dark-mode.svg.component';
import { OccEventBusService } from './../occ.event-bus.service';
import { OccMapEventEffectService } from './event.effect.occ.service';
import { OccLandingService } from './landing.effect.service';
import { OccMapLocateService } from './locate.occ.service';
import { MetroLine } from './metro.line.class';
import { clearGlobalStationToLineMap } from './metro.station.class';
import { OccMapOperationEffectService } from './operation.effect.occ.service';
import { OccTyphoonService } from './typhoon.occ.service';

const initialCenter: LatLngExpression = [31.15, 121.42];
const initialZoom = 10;

@Component({
  selector: 'occ-map',
  imports: [DarkModeSvgComponent, WindCircleComponent],
  templateUrl: './map.component.html',
  styleUrl: './map.component.less',
})
export class OccMapComponent {
  @ViewChild('mapRef') mapRef!: ElementRef<HTMLDivElement>;
  map?: Map;
  lineModels: MetroLine[] = [];
  lineLayerGroup: LayerGroup = new LayerGroup([]);
  stationLayerGroup: LayerGroup = new LayerGroup([]);
  eventTotalOverlayVisible = true;
  dutyShortageOverlayVisible = false;
  isRemote = true;
  customLocateMode = false;

  typhoonModel: Typhoon;
  cacheFTyphoonFrame?: AnimationFrame;
  windCircleVisible = false;

  @Input() currentLine = '1号线';
  @Input() events: ExtremeOcc.Event[] = [];
  @Input() operations: ExtremeOcc.Operation[] = [];

  fetchedEvent$ = this.occEventBusService.on(OccEventType.EVENTS_FETCHED);
  fetchedOperation$ = this.occEventBusService.on(
    OccEventType.OPERATIONS_FETCHED,
  );
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
    this.fetchedEvent$.subscribe((evs) => {
      this.afterFetchEvents(evs);
    });
    this.fetchedOperation$.subscribe((ops) => {
      this.afterFetchOperations(ops);
    });
    this.updateTyphoonPosition$.subscribe(
      ({ frame, previousStates, forecastStates }) => {
        this.updateTyphoonPosition(frame);
        this.updateTyphoonPath(previousStates);
        this.updateTyphoonForecastPath(forecastStates);

        this.landingService.tryToEffectPredictLanding();
        // const f = this.typhoonService.findPredictLandingInfo();
        // if (f?.landingState) {
        //   console.log(f.landingState);
        //   this.typhoonModel.updateLayersWithFrame(f.landingState);
        // }
      },
    );
    this.typhoonModel = new Typhoon({
      meta: {
        name: '',
        year: 2025,
        states: [],
      },
      omitLine: false,
      onStateUpdate: this.onTyphoonStateUpdate.bind(this),
    });
  }
  ngAfterViewInit() {
    this.map = this.mapService.getMapWithOptions(this.mapRef.nativeElement, {
      center: initialCenter,
      zoom: initialZoom,
      minZoom: 2,
      // maxZoom: 16,
    });
    this.lineLayerGroup.addTo(this.map);
    this.stationLayerGroup.addTo(this.map);
    this.attachClickEvent();
    this.locateService.mount(this.map);
    this.getRegion();
    this.mountTyphoon();
    this.landingService.mount(this.map!);
  }
  mountTyphoon() {
    this.map && this.typhoonModel.mount(this.map);
    this.typhoonService.mount(this.typhoonModel);
    const current = this.typhoonService.getCurrentTyphoonFrame();
    if (current?.frame) {
      this.updateTyphoonPosition(current.frame);
    }
  }
  onTyphoonStateUpdate() {}

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
      this.initMetro(this.currentLine);
      this.eventService.mount(this.map!, [this.currentLineModel!]);
      this.operationService.mount(this.map!, [this.currentLineModel!]);
      this.mapService.setDetailBoundaryPolygon();
      this.effectEvent(this.currentLine);
      this.effectOperation(this.currentLine);
    }, 200);
  }

  async initMetro(lineName: string) {
    if (!this.lineModels.length) {
      const lines = linesData2026;
      this.lineModels = lines.map((lineData) => {
        return new MetroLine({
          meta: lineData,
          eventBus: this.occEventBusService,
        });
      });
      this.stationLayerGroup.setZIndex(800);
      this.lineLayerGroup.setZIndex(100);
      this.lineModels
        .filter((l) => l.name === lineName)
        .forEach((l) =>
          l.mount([this.lineLayerGroup, this.stationLayerGroup], this.map!),
        );
    } else {
      this.lineModels
        .filter((l) => l.name === lineName)
        .forEach((l) => {
          if (l._mounted) {
            l.attachLine();
          } else {
            l.mount([this.lineLayerGroup, this.stationLayerGroup], this.map!);
          }
        });
    }
    this.lineModels.forEach((l) => {
      l.detachStations();
    });
    clearGlobalStationToLineMap();

    this.lineModels
      .filter((l) => l.name === lineName)
      .forEach((l) => {
        l.attachStations();
      });
  }
  afterFetchEvents(evs: ExtremeOcc.Event[]) {
    this.eventService.diffEventsAndEffect(evs);
  }
  afterFetchOperations(ops: ExtremeOcc.Operation[]) {
    this.operationService.diffOperationsAndEffect(ops);
  }

  effectEvent(lineName: string) {
    if (this.currentLineModel) {
      this.eventService.initializeEvents(this.events);
    }
    this.eventService.showEffect();
  }

  effectOperation(lineName: string) {
    this.operationService.showEffect();
  }

  clear() {
    this.lineModels.forEach((l) => {
      l.detachLine();
    });
  }

  onLocate(type: number, line: string) {
    this.eventService.hideEffect();
    this.operationService.temporaryHideEffect();
    if (type === 3) {
      this.customLocateMode = true;
    } else {
      this.lineModels.forEach((l) => {
        l.setLocateMode(type);
        if (l.name !== line) {
          l.detachLine();
        }
      });
    }
  }
  terminateLocate(line: string) {
    this.eventService.revertEffect();
    this.operationService.revertTemporaryEffect();
    this.lineModels.forEach((l) => {
      l.setLocateMode(0);
      if (l.name !== line) {
        l.attachLine();
      }
    });
    this.customLocateMode = false;
  }
  clearLocateIcons() {
    this.locateService.removeAllLocationIcons();
  }
  get currentLineModel() {
    return this.lineModels.find((m) => m.meta.name === this.currentLine);
  }
}
