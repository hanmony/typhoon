import {
  Component,
  ElementRef,
  input,
  output,
  signal,
  SimpleChanges,
  ViewChild,
} from '@angular/core';
import { geoJson, LatLngExpression, LayerGroup, Map } from 'leaflet';
import { NzImageService } from 'ng-zorro-antd/image';
import 'proj4leaflet';
import shp from 'shpjs';
import {
  AnimationFrame,
  Typhoon,
} from '../../case-detail/services/classes/typhoon.class';
import { DashboardMapService } from '../../case-detail/services/map.service';
import { ITyphoonState, linesData2026 } from '../../case-detail/services/meta';
import { DarkModeSvgComponent } from '../../dark-mode.svg/dark-mode.svg.component';
import { DashboardEventEffectService } from '../../dispatch-center/map/event.effect.dispatch.service';
import { OccLandingService } from '../../occ/map/landing.effect.service';
import { MetroLine as OccMetroLine } from '../../occ/map/metro.line.class';
import { clearGlobalStationToLineMap } from '../../occ/map/metro.station.class';
import { DashboardMapOperationEffectService } from '../../occ/map/operation.effect.occ.service';
import { OccTyphoonService } from '../../occ/map/typhoon.occ.service';
import { occEventCategories } from '../../occ/occ.const';
import { OccEventType } from '../../occ/occ.event-bus.model';
import { OccEventBusService } from '../../occ/occ.event-bus.service';
import { REMOTE_DISTINCT_ZOOM } from '../../supervisor/event.effect.supervisor.service';
import { DashboardPatrollingDetailComponent } from '../patrolling-detail/patrolling-detail.component';
import { environment } from '../../../../environments/environment';
import {
  ActionOverlayComponent,
  DashboardFilterState,
  getInitialDashboardState,
} from './action-overlay/action-overlay.component';
import { StatisticOverlayComponent } from './statistic-overlay/statistic-overlay.component';
import { DispatchTopActionComponent } from './top-action/top-action.component';

const initialCenter: LatLngExpression = [31.18, 121.36];
const initialZoom = 11;

@Component({
  selector: 'dispatch-dashboard-map',
  imports: [
    DarkModeSvgComponent,
    DispatchTopActionComponent,
    StatisticOverlayComponent,
    ActionOverlayComponent,
    DashboardPatrollingDetailComponent,
  ],
  templateUrl: './dashboard-map.component.html',
  styleUrl: './dashboard-map.component.less',
})
export class DashboardMapComponent {
  hideTitle = environment.hideTitle;
  @ViewChild('mapRef') mapRef!: ElementRef<HTMLDivElement>;
  @ViewChild(ActionOverlayComponent) actionOverlay?: ActionOverlayComponent;
  @ViewChild(DashboardPatrollingDetailComponent)
  patrollingDetailRef?: DashboardPatrollingDetailComponent;
  patrollingState = signal({
    visible: false,
    line: '',
  });

  initialFilterState = input.required<DashboardFilterState>();
  closeDashboard = output<void>();
  followTypeChange = output<string>();

  events = input<ExtremeOcc.Event[]>([]);
  operations = input<ExtremeOcc.Operation[]>([]);

  cacheFilterState: DashboardFilterState = getInitialDashboardState();

  get type() {
    return this.cacheFilterState.type;
  }

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
    private mapService: DashboardMapService,
    private nzImageService: NzImageService,
    private eventService: DashboardEventEffectService,
    private operationService: DashboardMapOperationEffectService,
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

  ngOnChanges(changes: SimpleChanges) {
    if (changes['initialFilterState']) {
      const state = this.initialFilterState();
      this.onFilterStateChange(state);
      this.actionOverlay?.followUpStream(state);
    }
  }

  ngAfterViewInit() {
    this.map = this.mapService.getMapWithOptions(this.mapRef.nativeElement, {
      center: initialCenter,
      zoom: initialZoom,
      maxZoom: 14,
    });
    this.map.on('click', (e) => {
      this.actionOverlay?.hidePopups();
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

  afterFetchEvents(evs: ExtremeOcc.Event[]) {
    const filteredEvents = evs.filter((e) => {
      if (this.type === 'operation') return false;
      if (!this.cacheFilterState.line.includes(e.line)) return false;
      const { type, level } = this.cacheFilterState.event;
      if (type !== 'all') {
        const c = occEventCategories.find((c) => c.label === type);
        if (!c) return false;
        if (!c.contains.includes(e.eventType)) return false;
      }
      if (level !== 'all') {
        if (level === 'normal' && e.severity) return false;
        if (level === 'severity' && !e.severity) return false;
        if (level === 'supervision' && !e.supervision) return false;
      }
      return true;
    });
    this.eventService.diffEventsAndEffect(filteredEvents);
  }
  afterFetchOperations(ops: ExtremeOcc.Operation[]) {
    const filteredOperations = ops.filter((o) => {
      if (this.type === 'event') return false;
      if (!this.cacheFilterState.line.includes(o.line)) return false;
      const { type } = this.cacheFilterState.operation;
      if (type !== 'all') {
        if (o.actionType !== type) return false;
      }
      return true;
    });
    this.operationService.diffOperationsAndEffect(filteredOperations);
  }

  afterTypeChange(type: string) {
    setTimeout(() => {
      this.afterFetchEvents(this.events());
      this.afterFetchOperations(this.operations());
    });
    this.setLinesColor(type);
  }

  setLinesColor(type: string) {
    this.lineModels.forEach((l) => {
      type === 'event' ? l.revertColor() : l.setRunningColor();
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
        // l.setRunningColor();
        l.hideStationName();
        l.mount([this.lineLayerGroup, this.stationLayerGroup], this.map!);
      });
    }
  }

  effectEvents() {
    if (this.lineModels.length) {
      this.eventService.initializeLineEvents(this.events());
    }
    this.eventService.showEffect();
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

  onFilterStateChange(state: DashboardFilterState) {
    const prevLinesString = this.cacheFilterState.line.join(',');
    const currentLinesString = state.line.join(',');
    if (this.cacheFilterState.type !== state.type) {
      this.setLinesColor(state.type);
      this.followTypeChange.emit(state.type);
    }
    this.cacheFilterState = state;
    if (prevLinesString !== currentLinesString) {
      this.onLineChange(state.line);
      return;
    }

    this.afterFetchEvents(this.events());
    this.afterFetchOperations(this.operations());
  }

  onLineChange(lines: string | string[]) {
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
  onTypeChange(type: string) {
    const state = getInitialDashboardState();
    state.type = type as DashboardFilterState['type'];
    this.cacheFilterState = state;
    this.followTypeChange.emit(type);
    this.afterTypeChange(type);
  }

  returnToCenter() {
    this.closeDashboard.emit();
  }

  openPatrollingDetail(line: string) {
    const visible = this.patrollingState().visible;
    if (!visible) {
      this.patrollingState.set({
        visible: true,
        line,
      });
    } else {
      this.patrollingDetailRef?.onLineChange(line);
    }
  }

  closePatrollingDetail() {
    this.patrollingState.update((prev) => ({ ...prev, visible: false }));
  }
}
