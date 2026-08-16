import {
  AfterViewInit,
  Component,
  ElementRef,
  NO_ERRORS_SCHEMA,
  TemplateRef,
  ViewChild,
} from '@angular/core';
import shp from 'shpjs';
import {
  KeyEventReactService,
  formatKeyEvent,
} from './services/key-event-react.service';

import { ActivatedRoute } from '@angular/router';
import { LayerGroup, Map, geoJson } from 'leaflet';
import { NzConfigService } from 'ng-zorro-antd/core/config';
import { NzMessageService } from 'ng-zorro-antd/message';
import { NzNotificationService } from 'ng-zorro-antd/notification';
import { DraggableComponent } from '../../common.component/draggable/draggable.component';
import { ActionDto } from '../../domain/action.dto';
import { CaseDto } from '../../domain/case.dto';
import { LibraryNzModule } from '../../library.nz.module';
import { ApiService } from '../../services/api.service';
import { AutoplayEventPandectModalComponent } from './autoplay-event-pandect-modal/autoplay-event-pandect-modal.component';
import { AutoPlayCountdownComponent } from './countdown/countdown.component';
import { DockComponent } from './dock/dock.component';
import {
  EventIllustrationComponent,
  SymbolTip,
} from './event-illustration/event-illustration.component';
import { CaseDetailHeaderComponent } from './header/header.component';
import { TyphoonIndicatorComponent } from './indicator/indicator.component';
import { LineEventsModalComponent } from './line-events-modal/line-events-modal.component';
import { PanelComponent } from './panel/panel.component';
import {
  constructionAdjustmentOptions,
  lineOptions,
  opEventsOptions,
  passengerDisposalOptions,
  passengerTransportMeasuresOptions,
  trafficMeasuresOptions,
} from './selections.data';
import { AutoPlayService, AutoPlayState } from './services/auto-play.service';
import { MetroLine } from './services/classes/metro.line.class';
import { AnimationFrame, Typhoon } from './services/classes/typhoon.class';
import { LocalEventReactService } from './services/local-event-react.service';
import { MapService } from './services/map.service';
import { ITyphoonData, transferPathInfosToTyphoonMeta } from './services/meta';
import { MetroService } from './services/metro.service';
import {
  LOCAL_CATEGORY_KEY,
  LOCAL_EVENT_KEYS_MAP,
  UtilsService,
  categoryToLabel,
  globalCategoryToLabel,
  keyToCategory,
} from './services/utils.service';
import { TimelineComponent, Timing } from './timeline/timeline.component';

import 'proj4leaflet';
import { ActionCategory } from '../../domain/action.category';
import { DarkModeSvgComponent } from '../dark-mode.svg/dark-mode.svg.component';
import { FilterModalComponent } from './filter-modal/filter-modal.component';
import { KeyEventModalComponent } from './key-event-modal/key-event-modal.component';
import { MediaPlayerModalComponent } from './media-player-modal/media-player-modal.component';
import { NotificationTemplateComponent } from './notification-template/notification-template.component';
import { MediaPlayService } from './services/media.play.service';

export type ComposeOption = Option & {
  disabled: boolean;
  checked: boolean;
};

export type FilterModel = Record<LOCAL_CATEGORY_KEY, ComposeOption[]>;

const getInitialComposeOptions = (options: Option[]) => {
  return options.map((e) => ({
    ...e,
    disabled: false,
    checked: true,
  }));
};

@Component({
  selector: 'app-case-detail',
  imports: [
    DarkModeSvgComponent,
    NotificationTemplateComponent,
    PanelComponent,
    CaseDetailHeaderComponent,
    DockComponent,
    TimelineComponent,
    DraggableComponent,
    LineEventsModalComponent,
    EventIllustrationComponent,
    AutoplayEventPandectModalComponent,
    AutoPlayCountdownComponent,
    TyphoonIndicatorComponent,
    MediaPlayerModalComponent,
    KeyEventModalComponent,
    FilterModalComponent,
    LibraryNzModule,
  ],
  templateUrl: './case-detail.component.html',
  schemas: [NO_ERRORS_SCHEMA],
  styleUrl: './case-detail.component.less',
})
export class CaseDetailComponent implements AfterViewInit {
  @ViewChild('mapRef') mapRef?: ElementRef;
  @ViewChild(TemplateRef, { static: false })
  notificationTemplateRef!: TemplateRef<{}>;
  @ViewChild('timelineRef') timelineRef?: TimelineComponent;
  @ViewChild(DockComponent) dockRef?: DockComponent;
  @ViewChild(PanelComponent) panelRef?: PanelComponent;
  @ViewChild(LineEventsModalComponent)
  lineEventsModalRef?: LineEventsModalComponent;
  @ViewChild(EventIllustrationComponent)
  eventIllustrationRef?: EventIllustrationComponent;
  @ViewChild(AutoplayEventPandectModalComponent)
  autoplayEventPandectModalRef?: AutoplayEventPandectModalComponent;
  @ViewChild(AutoPlayCountdownComponent)
  autoplayCountdownRef?: AutoPlayCountdownComponent;

  @ViewChild(KeyEventModalComponent)
  keyEventModalRef?: KeyEventModalComponent;

  @ViewChild(FilterModalComponent)
  filterModalRef?: FilterModalComponent;

  @ViewChild(TyphoonIndicatorComponent)
  indicatorRef?: TyphoonIndicatorComponent;
  darkMode = true;
  panelWidth = 450;
  id = '';
  detailInfo: CaseDto = new CaseDto();
  typhoonMeta?: ITyphoonData;
  rawEvents?: ActionDto[];
  filteredRawLocalEvents: ActionDto[] = [];
  timelineEvents: ActionDto[] = [];
  map?: Map;
  lineModels: MetroLine[] = [];
  filterModel: FilterModel;

  lineLayerGroup: LayerGroup = new LayerGroup([]);
  stationLayerGroup: LayerGroup = new LayerGroup([]);

  selectedTiming?: Timing;
  typhoonModel?: Typhoon;
  cacheFTyphoonFrame?: AnimationFrame;
  windCircleVisible = false;
  constructor(
    private readonly route: ActivatedRoute,
    private readonly mapService: MapService,
    private readonly apis: ApiService,
    private readonly metro: MetroService,
    private readonly utils: UtilsService,
    private readonly localEventReact: LocalEventReactService,
    private readonly keyEventReact: KeyEventReactService,
    private readonly autoPlayService: AutoPlayService,
    private readonly mediaPlayService: MediaPlayService,
    readonly notification: NzNotificationService,
    private nzConfigService: NzConfigService,
    readonly message: NzMessageService,
  ) {
    this.nzConfigService.set('message', { nzTop: 84 });

    this.route.paramMap.subscribe((paramMap) => {
      const id = paramMap.get('id');
      if (id) {
        this.fetchCaseDetail(id);
        this.fetchCaseEvents(id);
      }
    });
    this.filterModel = this.getFilterModel();
  }
  onWindCircleChange(v: boolean) {
    this.windCircleVisible = v;
    this.typhoonModel?.setWindCircleVisible(!v);
    // this.map?.invalidateSize();
  }
  clearAllEventReactions() {
    this.selectedTiming = undefined;
    this.typhoonModel?.moveOut();
    this.eventIllustrationRef?.clearWeatherAlerts();
    this.eventIllustrationRef?.clearSymbolTips();
    this.panelRef?.clearEvents();
    this.localEventReact.clearAllReaction();
    this.keyEventReact.clearReaction();
  }
  setSelectedTiming(t?: Timing) {
    const clear = () => {
      this.clearAllEventReactions();
      this.indicatorRef?.hide();
      this.metro.revertColor();
      this.eventIllustrationRef?.clearWeatherAlerts();
      this.autoplayEventPandectModalRef?.closeImmediately();
    };
    if (!t) {
      clear();
      return;
    }
    if (this.selectedTiming && this.selectedTiming.startTime === t.startTime) {
      clear();
      return;
    }
    this.selectedTiming = t;
    this.typhoonModel?.locateByTime(new Date(t.startTime));

    const evs = this.selectedTiming.events;

    this.reactWeatherAlerts(t.startTime);

    this.panelRef?.clearEvents();
    evs.forEach((e) => {
      const panelReact = globalCategoryToLabel[e.category];
      if (panelReact) {
        this.panelRef?.pushEvent(e);
      }
    });
    this.localEventReact.clearAllReaction();
    this.keyEventReact.clearReaction();
    this.localEventReact.react(evs);
    this.keyEventReact.react(evs);
    this.metro.setRunningColor();
    this.autoplayEventPandectModalRef?.closeImmediately();
  }
  reactWeatherAlerts(t: string) {
    const weatherAlertStrings = this.utils.getWeatherStringsByTime(t);
    this.eventIllustrationRef?.showWeatherAlerts(weatherAlertStrings);
  }
  onToolVisibleChange(disabledList: string[]) {
    if (this.selectedTiming) {
      const disabledCategories = disabledList
        .map((e) => {
          return keyToCategory[e];
        })
        .filter((e) => e);
      const evs = this.selectedTiming.events.filter((e) => {
        return !disabledCategories.includes(e.category);
      });
      this.localEventReact.clearAllReaction();
      // this.keyEventReact.clearReaction();
      this.localEventReact.react(evs);
      // this.keyEventReact.react(evs);
    }
  }
  getFilterModel(): FilterModel {
    return {
      lines: getInitialComposeOptions(lineOptions),
      opEvents: getInitialComposeOptions(opEventsOptions),
      trafficMeasures: getInitialComposeOptions(trafficMeasuresOptions),
      passengerTransportMeasures: getInitialComposeOptions(
        passengerTransportMeasuresOptions,
      ),
      passengerDisposals: getInitialComposeOptions(passengerDisposalOptions),
      constructionAdjustments: getInitialComposeOptions(
        constructionAdjustmentOptions,
      ),
    };
  }
  async fetchCaseDetail(id: string) {
    this.detailInfo = await this.apis.manager.getCase(id);
    const pathInfos = await this.apis.manager.getPathInfos(
      this.detailInfo.name,
    );
    this.typhoonMeta = transferPathInfosToTyphoonMeta(
      pathInfos,
      this.detailInfo,
    );
    if (this.typhoonMeta) {
      this.typhoonModel = new Typhoon({
        meta: this.typhoonMeta!,
        omitLine: false,
        onStateUpdate: this.onStateUpdate.bind(this),
      });
      this.mountTyphoon();
    }
  }
  onStateUpdate(state: AnimationFrame) {
    if (!state.center[0]) {
      return;
    }
    if (
      this.selectedTiming ||
      this.autoPlayService.state === AutoPlayState.RUNNING ||
      this.autoPlayService.state === AutoPlayState.PAUSED
    ) {
      const relativePosition = this.map!.latLngToContainerPoint(state.center);
      const landingTime = this.typhoonModel!.getLandingTime();
      this.indicatorRef?.update(
        relativePosition.x,
        relativePosition.y,
        landingTime - (state.immediateTime || Infinity),
      );
      this.cacheFTyphoonFrame = state;
    }
  }

  mountTyphoon() {
    this.map && this.typhoonModel?.mount(this.map);
    this.lineModels.forEach((lineModel) => {
      lineModel.mount([this.lineLayerGroup, this.stationLayerGroup], this.map!);
    });
  }
  async fetchCaseEvents(id: string) {
    this.rawEvents = await this.apis.manager.getEvents(id, '');
    this.utils.setRawEvents(this.rawEvents);
    this.filteredRawLocalEvents = this.rawEvents.slice();

    this.calcFilteredRawLocalEvents();
    this.setFilterDisabledPropertiesByLines();
    this.setTimeLineEvents();
    setTimeout(() => {
      this.timelineRef?.init();
    });
  }
  setTimeLineEvents() {
    this.timelineEvents = [
      ...this.utils.serializedEventsDto.globalEvents,
      ...(this.filteredRawLocalEvents || []),
    ];
  }
  async initMap() {
    this.map = this.mapService.getMap(this.mapRef!.nativeElement);
    // this.__TEMP_MAP_CLICK();
    this.map.doubleClickZoom.disable();
    this.lineLayerGroup.addTo(this.map);
    this.stationLayerGroup.addTo(this.map);
    this.map.on('moveend', () => {
      if (this.cacheFTyphoonFrame) this.onStateUpdate(this.cacheFTyphoonFrame);
    });
    this.map.on('zoomend', () => {
      if (this.cacheFTyphoonFrame) this.onStateUpdate(this.cacheFTyphoonFrame);
    });
    await this.getRegion();
  }
  __TEMP_MAP_CLICK() {
    this.map?.on('click', (e) => {
      // console.log(e.latlng.toString());
      // popup()
      //   .setLatLng(e.latlng)
      //   .setContent(e.latlng.toString())
      //   .openOn(this.map!);
    });
  }
  async getRegion() {
    // window.location.origin
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
  }
  setZoom() {
    setTimeout(() => {
      const w = document.documentElement.offsetWidth;
      if (w < 1750) {
        this.panelWidth = 400;
      } else {
        this.panelWidth = 450;
      }
    });
  }
  async initMetro() {
    const { lines } = this.metro.getMetroData();
    this.lineModels = lines.map((lineData) => {
      return this.metro.getLineModel(lineData, this);
    });
    this.metro.setModels(this.lineModels);
    this.lineLayerGroup.setZIndex(100);
    this.stationLayerGroup.setZIndex(800);
  }
  toggleDarkMode() {
    this.darkMode = !this.darkMode;
  }
  onFilterChange({
    key,
    option,
  }: {
    key: LOCAL_CATEGORY_KEY;
    option: ComposeOption;
  }) {
    option.checked = !option.checked;
    if (key === 'lines') {
      this.setFilterDisabledPropertiesByLines();
    }
    this.calcFilteredRawLocalEvents();
    this.lineLayerFollowVisibility();
    this.setTimeLineEvents();
    setTimeout(() => {
      this.timelineRef?.init();
      this.dockRef?.commonEventModal?.close();
    });
  }
  onFilterBundleChange(key: LOCAL_CATEGORY_KEY) {
    const ops = this.filterModel[key].filter((e) => !e.disabled);
    const noChecked = ops.every((e) => !e.disabled && !e.checked);
    const allChecked = ops.every((e) => !e.disabled && e.checked);
    ops.forEach((e) => {
      if (e.disabled) return;
      e.checked = noChecked ? true : allChecked ? false : true;
    });

    if (key === 'lines') {
      this.setFilterDisabledPropertiesByLines();
    }

    this.calcFilteredRawLocalEvents();
    this.lineLayerFollowVisibility();
    this.setTimeLineEvents();
    setTimeout(() => {
      this.timelineRef?.init();
      this.dockRef?.commonEventModal?.close();
    });
  }
  lineLayerFollowVisibility() {
    const lastActions = this.utils.getFilteredRawEventsByFilterModel(
      this.utils.serializedEventsDto.localEvents!,
      this.filterModel,
    );
    const lines = Array.from(
      this.utils.separateEventsByLine(lastActions).entries(),
    ).map(([k, v]) => {
      return k;
    });
    this.metro.clearStationsCache();
    this.metro.followVisibility(lines);
  }
  isFilterModelCheckedEntirely() {
    for (const [key] of LOCAL_EVENT_KEYS_MAP) {
      const modelItem = this.filterModel[key];
      for (const item of modelItem) {
        if (!item.checked) return false;
      }
    }
    return true;
  }
  calcFilteredRawLocalEvents() {
    this.filteredRawLocalEvents = this.utils.getFilteredRawEventsByFilterModel(
      this.utils.serializedEventsDto.localEvents!,
      this.filterModel,
    );
  }

  setFilterDisabledPropertiesByLines() {
    const lastActions = this.utils.getFilteredRawEventsByLineModel(
      this.utils.serializedEventsDto.localEvents!,
      this.filterModel,
    );
    const typeMap = this.utils.separateEventsByType(lastActions);
    LOCAL_EVENT_KEYS_MAP.forEach(([key, category]) => {
      const targetCategory = typeMap.get(category);
      if (!targetCategory) {
        this.filterModel[key].forEach((e) => {
          e.checked = false;
          e.disabled = true;
        });
      } else {
        this.filterModel[key].forEach((e) => {
          const has = targetCategory.get(e.value as string);
          e.checked = !!has;
          e.disabled = !has;
        });
      }
    });
  }
  setFilterDisabledPropertiesByEvents(changeKey: LOCAL_CATEGORY_KEY) {
    this.calcFilteredRawLocalEvents();
    const typeMap = this.utils.separateEventsByType(
      this.filteredRawLocalEvents,
    );
    LOCAL_EVENT_KEYS_MAP.forEach(([key, category]) => {
      if (key === changeKey) return;
      const targetCategory = typeMap.get(category);
      if (!targetCategory) {
        this.filterModel[key].forEach((e) => {
          e.disabled = true;
        });
      } else {
        this.filterModel[key].forEach((e) => {
          targetCategory.get(e.value as string)
            ? (e.disabled = false)
            : (e.disabled = true);
        });
      }
    });
  }

  setLineFilterCheckedPropertiesByEvents() {
    const lastActions = this.utils.getFilteredRawEventsByTypeModel(
      this.utils.serializedEventsDto.localEvents!,
      this.filterModel,
    );
    const lineMap = this.utils.separateEventsByLine(lastActions);
    this.filterModel['lines'].forEach((e) => {
      const has = lineMap.get(e.value as string);
      e.checked = !!has;
    });
  }
  setEventFilterCheckedPropertiesByLines() {
    const lastActions = this.utils.getFilteredRawEventsByLineModel(
      this.utils.serializedEventsDto.localEvents!,
      this.filterModel,
    );
    const typeMap = this.utils.separateEventsByType(lastActions);
    LOCAL_EVENT_KEYS_MAP.forEach(([key, category]) => {
      const targetCategory = typeMap.get(category);
      if (!targetCategory) {
        this.filterModel[key].forEach((e) => {
          e.checked = false;
        });
      } else {
        this.filterModel[key].forEach((e) => {
          const has = targetCategory.get(e.value as string);
          e.checked = !!has;
        });
      }
    });
  }
  async ngAfterViewInit() {
    this.setZoom();
    await this.initMap();
    await this.initMetro();
    if (this.typhoonModel) {
      if (!this.typhoonModel?.hasMounted) {
        this.typhoonModel?.mount(this.map!);
      }
    }
    this.localEventReact.init({
      map: this.map!,
      lines: this.lineModels,
      dock: this.dockRef!,
      eventIllustrationRef: this.eventIllustrationRef!,
    });
    this.autoPlayService.init({ caseDetailRef: this });
  }

  openLineDataModal(line: string) {
    if (this.timelineRef?.autoPlaying) return;
    const actions = this.utils.serializedEventsDto.mapByLine.get(line) || [];
    const data = this.utils.separateEventsByCategory(actions);
    this.lineEventsModalRef!.open(line, data);
  }
  handleLocate(ev: ActionDto) {
    this.locateEvent({
      event: ev,
      move: true,
    });
  }
  locateEvent(p: { event: ActionDto; move: boolean }) {
    const { event, move } = p;
    const timeString = this.utils.formatTimeString(new Date(event.fromDate));
    const hasTiming = this.timelineRef?.findTiming(timeString);

    if (!hasTiming) {
      this.noticeLocateError(event);
    } else {
      const hasEvent = hasTiming.events.find((e) => e._id === event._id);
      if (!hasEvent) {
        return this.noticeLocateError(event);
      }
      if (hasTiming.startTime !== this.selectedTiming?.startTime) {
        this.setSelectedTiming(hasTiming);
      }
      move && this.localEventReact.locateEvent(event);
    }
  }
  handleViewAccessories(ev: ActionDto) {
    this.mediaPlayService.show([ev]);
  }
  noticeLocateError(event: ActionDto) {
    const subType = this.utils.getLocalEventSubType(event) || '未知';
    this.notification.create(
      'error',
      '定位失败',
      `未选择【${categoryToLabel[event.category]} - ${subType}】，无法定位`,
      {
        nzPlacement: 'topLeft',
        nzStyle: {
          top: '110px',
          background:
            'linear-gradient(225deg, #081835 0%, #081835 15%, #173f6d 85%, #173f6d 100%)',
        },
      },
    );
  }
  autoPlayEffectMap(time: string, evs: ActionDto[]) {
    const weatherAlterStrings = this.utils.getWeatherStringsByTime(time);
    this.eventIllustrationRef?.showWeatherAlerts(weatherAlterStrings);
    this.localEventReact.autoPlayEffectMap(evs);
  }
  clearAutoPlayMap() {
    this.eventIllustrationRef?.autoPlayClearMap();
    this.localEventReact.autoPlayClearMap();
    this.indicatorRef?.hide();
  }
  prepareAutoPlaying() {
    this.dockRef?.commonEventModal?.close();
    this.lineEventsModalRef?.close();
    this.dockRef?.typhoonDetailModal?.close();
    this.dockRef?.illustrationModal?.close();
    this.dockRef?.publicOpinionInformationComponent?.close();
    this.indicatorRef?.setBoundary();
    this.setSelectedTiming();
    this.clearAutoPlayMap();
    this.indicatorRef?.hide();
  }
  symbolClickHandler(st: SymbolTip) {
    if (st.category === ActionCategory.keynote) {
      const evs = this.selectedTiming?.events || [];
      const keynote = evs.find((e) => e.category === st.category);
      if (!keynote) {
        return;
      }
      this.keyEventModalRef?.show(formatKeyEvent(keynote, this.utils));
      return;
    }
    this.autoplayEventPandectModalRef?.open(
      st.category,
      this.selectedTiming?.events || [],
      true,
    );
  }
  toggleFilterModal() {
    this.filterModalRef?.toggleVisible();
  }
}
