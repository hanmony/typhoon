import {
  Component,
  ElementRef,
  input,
  output,
  signal,
  ViewChild,
} from '@angular/core';
import { geoJson, LatLngExpression, LayerGroup, Map } from 'leaflet';
import { NzImageService } from 'ng-zorro-antd/image';
import shp from 'shpjs';
import { getPositionFromEvent } from '../../../shared/shared.event.effect';
import {
  AnimationFrame,
  Typhoon,
} from '../../case-detail/services/classes/typhoon.class';
import { MapService } from '../../case-detail/services/map.service';
import { ITyphoonState, linesData2026 } from '../../case-detail/services/meta';
import { DarkModeSvgComponent } from '../../dark-mode.svg/dark-mode.svg.component';
import { OccLandingService } from '../../occ/map/landing.effect.service';
import { MetroLine as OccMetroLine } from '../../occ/map/metro.line.class';
import { clearGlobalStationToLineMap } from '../../occ/map/metro.station.class';
import { OccMapOperationEffectService } from '../../occ/map/operation.effect.occ.service';
import { OccTyphoonService } from '../../occ/map/typhoon.occ.service';
import { OccEventType } from '../../occ/occ.event-bus.model';
import { OccEventBusService } from '../../occ/occ.event-bus.service';
import { SupervisorEventEffectService } from '../event.effect.supervisor.service';
import { ToolItem } from '../supervisor-dock/supervisor-dock.component';

const initialCenter: LatLngExpression = [31.16, 121.65];
const initialZoom = 10;
const REMOTE_DISTINCT_ZOOM = 12;

@Component({
  selector: 'supervisor-map',
  imports: [DarkModeSvgComponent],
  templateUrl: './supervisor-map.component.html',
  styleUrl: './supervisor-map.component.less',
})
export class SupervisorMapComponent {
  @ViewChild('mapRef') mapRef!: ElementRef<HTMLDivElement>;

  onMapClick = output();

  scale = 'scale(4)';
  dockConfig = signal({
    x: 1336,
    y: 131,
  });

  events = input<ExtremeOcc.Event[]>([]);
  operations = input<ExtremeOcc.Operation[]>([]);

  cacheLines = signal<string[]>(linesData2026.map((l) => l.name));

  map?: Map;
  typhoonModel: Typhoon;

  isRemote = true;

  lineModels: OccMetroLine[] = [];
  lineLayerGroup: LayerGroup = new LayerGroup([]);
  stationLayerGroup: LayerGroup = new LayerGroup([]);

  fetchedEvent$ = this.occEventBusService.on(OccEventType.EVENTS_FETCHED);
  fetchedOperation$ = this.occEventBusService.on(
    OccEventType.OPERATIONS_FETCHED,
  );
  updateTyphoonPosition$ = this.occEventBusService.on(
    OccEventType.UPDATE_TYPHOON_POSITION,
  );
  readImages$ = this.occEventBusService.on(OccEventType.READ_IMAGES);

  constructor(
    private elementRef: ElementRef,
    private mapService: MapService,
    private nzImageService: NzImageService,
    private eventService: SupervisorEventEffectService,
    private operationService: OccMapOperationEffectService,
    private typhoonService: OccTyphoonService,
    private landingService: OccLandingService,
    private occEventBusService: OccEventBusService,
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
    this.fetchedEvent$.subscribe((events) => {
      this.afterFetchEvents(events);
    });
    this.fetchedOperation$.subscribe((operations) => {
      this.afterFetchOperations(operations);
    });
    this.updateTyphoonPosition$.subscribe(
      ({ frame, previousStates, forecastStates }) => {
        this.updateTyphoonPosition(frame);
        this.updateTyphoonPath(previousStates);
        this.updateTyphoonForecastPath(forecastStates);
        this.landingService.tryToEffectPredictLanding();
      },
    );
    this.readImages$.subscribe((p) => {
      this.readImages(p);
    });
  }

  ngAfterViewInit() {
    this.updateDockPosition();
    this.map = this.mapService.getMapWithOptions(this.mapRef.nativeElement, {
      center: initialCenter,
      zoom: initialZoom,
      maxZoom: 14,
    });
    this.mapService.zoomFallback(this.map);
    this.map.on('click', (e) => {
      this.onMapClick.emit();
    });
    this.map.on('zoomend', () => {
      this.isRemote = this.map!.getZoom() < REMOTE_DISTINCT_ZOOM;
    });
    this.lineLayerGroup.addTo(this.map);
    this.stationLayerGroup.addTo(this.map);

    this.getRegion();
    this.mountTyphoon();
    this.landingService.mount(this.map!);
  }
  readImages(p: { images: string[] }) {
    this.nzImageService.preview(
      p.images.map((i) => {
        return {
          src: '/api' + i,
        };
      }),
      { nzZoom: 1, nzRotate: 0 },
    );
  }

  updateDockPosition() {
    const container = this.elementRef.nativeElement;
    if (!container) return;
    this.dockConfig.update((prev) => ({
      ...prev,
      x: container.clientWidth - 200,
    }));
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
      this.mapService.setDetailBoundaryPolygon();
      this.effectEvents();
    }, 200);
  }
  async initMetro() {
    if (!this.lineModels.length) {
      const lines = linesData2026;
      this.lineModels = lines.map((lineData) => {
        return new OccMetroLine({
          meta: lineData,
          eventBus: this.occEventBusService,
        });
      });
      this.stationLayerGroup.setZIndex(800);
      this.lineLayerGroup.setZIndex(100);
      this.lineModels.forEach((l) => {
        l.setRunningColor();
        l.hideStationName();
        l.mount([this.lineLayerGroup, this.stationLayerGroup], this.map!);
      });
    }
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
  onTyphoonStateUpdate() {}

  setEffectVisibility(toolItem: ToolItem) {
    const visible = !toolItem.inactive;
    switch (toolItem.name) {
      case '台风路径':
        this.typhoonModel.toggleLineLayer(visible);
        break;
      case '天气动画':
        this.typhoonModel.setWindCircleVisible(visible);
        break;
      case '站点名称':
        this.toggleLineName(visible);
        break;
      default:
        break;
    }
  }
  effectEvents() {
    if (this.lineModels.length) {
      this.eventService.initializeLineEvents(this.events());
    }
    this.eventService.showEffect();
  }
  toggleOperations(visible: boolean) {
    this.operationService.setVisibility(visible);
    this.lineModels.forEach((l) => {
      if (visible) {
        l.setRunningColor();
      } else {
        l.revertColor();
      }
    });
  }
  toggleLineName(visible: boolean) {
    const currentLines = this.cacheLines();
    this.lineModels
      .filter((m) => currentLines.includes(m.name))
      .forEach((l) => {
        if (visible) {
          l.revertStationName();
        } else {
          l.hideStationName();
        }
      });
  }

  afterFetchEvents(evs: ExtremeOcc.Event[]) {
    const lineFilter = (e: ExtremeOcc.Event) => {
      if (this.cacheLines().includes(e.line)) {
        return true;
      }
      return false;
    };
    this.eventService.diffEventsAndEffect(evs.filter(lineFilter));
  }
  afterFetchOperations(ops: ExtremeOcc.Operation[]) {
    const filteredOperations = ops.filter((o) =>
      this.cacheLines().includes(o.line),
    );
    this.operationService.diffOperationsAndEffect(filteredOperations);
  }

  onLineChange(lines: string | string[]) {
    this.cacheLines.set(lines as string[]);
    this.lineModels.forEach((l) => {
      l.detachStations();
    });
    clearGlobalStationToLineMap();
    this.lineModels.forEach((l) => {
      if ((lines as string[]).includes(l.meta.name)) {
        l.attachLine();
      } else {
        l.detachLine();
      }
    });
    this.lineModels
      .filter((l) => lines.includes(l.name))
      .forEach((l) => l.attachStations());
    this.eventService.onLineVisibleChange(lines as string[]);
    setTimeout(() => {
      this.afterFetchEvents(this.events());
      this.afterFetchOperations(this.operations());
    });
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
}
