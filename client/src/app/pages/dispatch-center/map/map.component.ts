import {
  Component,
  computed,
  ElementRef,
  input,
  output,
  signal,
  ViewChild,
} from '@angular/core';
import { geoJson, LatLngExpression, LayerGroup, Map } from 'leaflet';
import { NzImageService } from 'ng-zorro-antd/image';
import 'proj4leaflet';
import shp from 'shpjs';
import { EmergencyResponseAlertsComponent } from '../../../shared/emergency-response-alerts/emergency-response-alerts.component';
import { getPositionFromEvent } from '../../../shared/shared.event.effect';
import {
  AnimationFrame,
  Typhoon,
} from '../../case-detail/services/classes/typhoon.class';
import { ITyphoonState, linesData2026 } from '../../case-detail/services/meta';
import { DashboardLandingService } from '../../occ/map/landing.effect.service';
import { MetroLine as OccMetroLine } from '../../occ/map/metro.line.class';
import { clearGlobalStationToLineMap } from '../../occ/map/metro.station.class';
import { OccMapOperationEffectService } from '../../occ/map/operation.effect.occ.service';
import { OccTyphoonService } from '../../occ/map/typhoon.occ.service';
import { OccEventType } from '../../occ/occ.event-bus.model';
import { OccEventBusService } from '../../occ/occ.event-bus.service';
import { MapService } from './../../case-detail/services/map.service';
import { DarkModeSvgComponent } from './../../dark-mode.svg/dark-mode.svg.component';
import { CompareTimelineComponent } from './compare-timeline/compare-timeline.component';
import { DispatchCenterDockComponent, ToolItem } from './dock/dock.component';
import { EventOverlayComponent } from './event-overlay/event-overlay.component';
import {
  DispatchEventEffectService,
  REMOTE_DISTINCT_ZOOM,
} from './event.effect.dispatch.service';
import { DispatchCenterFunctionOverlayComponent } from './function-overlay/function-overlay.component';
import { IllustrationModalComponent } from './illustration-modal/illustration-modal.component';
import { TyphoonCompareModalComponent } from './typhoon-compare-modal/typhoon-compare-modal.component';
import { TyphoonCompareService } from './typhoon.compare.service';

const initialCenter: LatLngExpression = [31.0, 121.5];
const initialZoom = 10;

@Component({
  selector: 'dispatch-center-map',
  imports: [
    DarkModeSvgComponent,
    EventOverlayComponent,
    DispatchCenterDockComponent,
    DispatchCenterFunctionOverlayComponent,
    IllustrationModalComponent,
    TyphoonCompareModalComponent,
    EmergencyResponseAlertsComponent,
    CompareTimelineComponent,
  ],
  templateUrl: './map.component.html',
  styleUrl: './map.component.less',
})
export class DispatchCenterMapComponent {
  @ViewChild(IllustrationModalComponent)
  illustrationModal?: IllustrationModalComponent;
  @ViewChild(TyphoonCompareModalComponent)
  typhoonCompareModal?: TyphoonCompareModalComponent;
  @ViewChild('mapRef') mapRef!: ElementRef<HTMLDivElement>;

  dockConfig = signal({
    x: 1336,
    y: 131,
  });

  events = input<ExtremeOcc.Event[]>([]);
  operations = input<ExtremeOcc.Operation[]>([]);
  toggleSimulatedPatrolling = output<void>();

  cacheLines = signal<string[]>(linesData2026.map((l) => l.name));
  allLines = linesData2026.map((l) => l.name);
  filteredRepairState = signal<number>(-1);

  shouldShownEvents = computed(() => {
    const filteredRepairState = this.filteredRepairState();
    const cacheLines = this.cacheLines();
    return this.events().filter((e) => {
      if (filteredRepairState !== -1) {
        if (!e.urgentRepair) return false;
        if (e.urgentRepairStatus !== filteredRepairState) return false;
      }
      if (cacheLines.includes(e.line)) {
        return true;
      }
      return false;
    });
  });
  shouldShownOperations = computed(() => {
    return this.operations().filter((o) => this.cacheLines().includes(o.line));
  });

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
    private eventService: DispatchEventEffectService,
    private operationService: OccMapOperationEffectService,
    private typhoonService: OccTyphoonService,
    private landingService: DashboardLandingService,
    private occEventBusService: OccEventBusService,
    private typhoonCompareService: TyphoonCompareService,
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

  get isComparing() {
    return this.typhoonCompareService.isComparing;
  }

  ngAfterViewInit() {
    this.updateDockPosition();
    this.map = this.mapService.getMapWithOptions(this.mapRef.nativeElement, {
      center: initialCenter,
      zoom: initialZoom,
      maxZoom: 14,
    });
    this.mapService.zoomFallback(this.map);
    // this.map.on('click', (e) => {
    //   console.log(e);
    // });
    this.map.on('zoomend', () => {
      this.isRemote = this.map!.getZoom() < REMOTE_DISTINCT_ZOOM;
    });
    this.lineLayerGroup.addTo(this.map);
    this.stationLayerGroup.addTo(this.map);

    this.getRegion();
    this.mountTyphoon();
    this.landingService.mount(this.map!);
    this.typhoonCompareService.mount(this.map!);
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
      case '线路情况':
        this.toggleOperations(visible);
        break;
      case '事件情况':
        this.eventService.setVisibility(visible);
        break;
      case '台风路径':
        this.typhoonModel.toggleLineLayer(visible);
        break;
      case '天气动画':
        this.typhoonModel.setWindCircleVisible(visible);
        break;
      case '站点名称':
        this.toggleLineName(visible);
        break;
      case '图例说明':
        this.toggleIllustrationModal(visible);
        break;
      // case '智慧工具':
      //   this.toggleTyphoonCompareModal(visible);
      case '台风对比':
        this.toggleTyphoonCompareModal(visible);
        break;
      case '模拟巡道':
        this.toggleSimulatedPatrolling.emit();
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
  toggleIllustrationModal(visible: boolean) {
    this.illustrationModal?.setVisible(visible);
  }

  toggleTyphoonCompareModal(visible: boolean) {
    this.typhoonCompareModal?.setVisible(visible);
  }

  afterFetchEvents(evs: ExtremeOcc.Event[]) {
    const filteredRepairState = this.filteredRepairState();
    const filteredEvents = evs.filter((e) => {
      if (filteredRepairState !== -1) {
        if (!e.urgentRepair) return false;
        if (e.urgentRepairStatus !== filteredRepairState) return false;
      }
      if (this.cacheLines().includes(e.line)) {
        return true;
      }
      return false;
    });
    this.eventService.diffEventsAndEffect(filteredEvents);
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
    setTimeout(() => {
      this.afterFetchEvents(this.events());
      this.afterFetchOperations(this.operations());
    });
  }
  onFilteredRepairStateChange(state: number) {
    this.filteredRepairState.set(state);
    this.afterFetchEvents(this.events());
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
