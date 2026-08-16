import { computed, Injectable, signal } from '@angular/core';
import dayjs from 'dayjs';
import { Map } from 'leaflet';
import { Subject } from 'rxjs';
import { ActionCategory } from '../../../domain/action.category';
import { CaseDto } from '../../../domain/case.dto';
import { ApiService } from '../../../services/api.service';
import { Typhoon } from '../../case-detail/services/classes/typhoon.class';
import {
  ITyphoonData,
  transferPathInfosToTyphoonMeta,
} from '../../case-detail/services/meta';
import { UtilsService } from '../../case-detail/services/utils.service';

interface SimpleTyphoon {
  id: string;
  name: string;
  unitKey: string;
  level: string;
  degree: string;
  speed: string;
  direction: string;
  totalEventCount: string;
  effectDuration: string;
  meta: CaseDto;
}

export interface ComparePoint {
  key: string;
  date: string;
  time: string;
  type: string;
  degree: string;
  formattedDateString: string;
  icon: string;
  weatherText: string;
  weatherColor: string;
  // rawEvent: any;
}

interface DetailTyphoon {
  id: string;
  name: string;
  level: string;
  degree: string;
  speed: string;
  direction: string;
  totalEventCount: string;
  effectDuration: string;
  keyFrames: ComparePoint[];
  meta: ITyphoonData;
}

export interface CompareStateItem {
  id: string;
  instance: Typhoon;
  selectedPoint?: ComparePoint | null;
  comparingPoints: ComparePoint[];
  exist: boolean;
  visible: boolean;
  color: string;
}

type TyphoonRecord = Record<string, DetailTyphoon>;

const utils = new UtilsService();

const colors = ['#05FF00', '#FFB800', '#FF00F5'];

@Injectable({
  providedIn: 'root',
})
export class TyphoonCompareService {
  // visible = signal(false);
  private _historyTyphoons = signal<CaseDto[]>([]);
  private _state = signal<CompareStateItem[]>([]);
  map!: Map;
  computedHistoryTyphoons = computed<SimpleTyphoon[]>(() => {
    const list = this._historyTyphoons();
    return list.map((t) => {
      return {
        id: t._id,
        name: t.name,
        unitKey: t.values['台风编号']?.value || '',
        level: t.values['台风类型']?.value || '',
        degree: t.values['台风最大预警等级']?.value || '',
        speed: t.values['台风最大风力']?.value || '',
        direction: t.values['台风走向']?.value || '',
        totalEventCount: t.values['影响事件']?.value || '',
        effectDuration: t.values['影响上海时长']?.value || '',
        meta: t,
      };
    });
  });
  compareChangeSubject$ = new Subject<string[]>();

  get state() {
    return this._state();
  }

  currentExistState = computed(() => {
    return this._state().filter((s) => s.exist);
  });
  currentVisibleState = computed(() => {
    return this._state().filter((s) => s.visible);
  });
  currentComparingIds = computed(() => {
    return this._state()
      .filter((s) => s.exist)
      .map((s) => s.id);
  });

  get currentCompareTyphoonNames() {
    const ids = this.currentComparingIds();
    return this.computedHistoryTyphoons()
      .filter((t) => ids.includes(t.id))
      .map((t) => t.name);
  }

  get isComparing() {
    return this.currentComparingIds().length > 0;
  }

  private records: TyphoonRecord = {} as TyphoonRecord;
  setRecord(id: string, record: DetailTyphoon) {
    this.records[id] = record;
  }
  setCurrentPoint(
    instance: Typhoon,
    point?: ComparePoint,
    visible: boolean = true,
  ) {
    if (visible && point) {
      instance.locateByTime(new Date(point.formattedDateString));
      const positions = instance.meta.states.map((s) => s.center);
      if (positions.length) {
        instance.updateForecastLineLayer(positions);
      }
    }
  }
  setCurrentPointOnView(state: CompareStateItem, point: ComparePoint) {
    this._state.update((current) => {
      return current.map((s) => {
        if (s.id === state.id) {
          return {
            ...s,
            selectedPoint: point,
          };
        }
        return s;
      });
    });
    this.setCurrentPoint(state.instance, point, state.visible);
    this.compareChangeSubject$.next(this.currentComparingIds());
  }

  mount(map: Map) {
    this.map = map;
    const initialState = Array.from({ length: 3 }).map((_, index) => ({
      id: `${index}`,
      instance: new Typhoon({
        meta: {
          name: '',
          year: 2025,
          states: [],
        },
        omitLine: false,
        // historyLineColor: colors[index] + 'dd',
        forecastLineColor: colors[index] + '99',
        showName: true,
      }),
      selectedPoint: null,
      comparingPoints: [],
      exist: false,
      visible: false,
      color: colors[index] + '99',
    }));
    this._state.set(
      initialState.map((s, index) => ({
        ...s,
      })),
    );
    initialState.forEach((s) => s.instance.mount(map));
  }

  cancelComparing(id: string) {
    const currentState = this._state();
    const targetIndex = currentState.findIndex((s) => s.id === id);
    if (targetIndex !== -1) {
      const target = currentState[targetIndex];
      target.selectedPoint = null;
      target.exist = false;
      target.visible = false;
      target.instance.moveOut();
      target.instance.removeForecastLineLayerFake();
      this._state.set([...currentState]);
    }
    this.compareChangeSubject$.next(this.currentComparingIds());
  }

  toggleVisible(id: string) {
    const currentState = this._state();
    const targetIndex = currentState.findIndex((s) => s.id === id);
    if (targetIndex === -1) {
      return;
    }
    const target = currentState[targetIndex];
    const prev = target.visible;

    if (prev) {
      target?.instance.moveOut();
      target.instance.removeForecastLineLayerFake();
      target.visible = false;
    } else {
      if (target.selectedPoint) {
        this.setCurrentPoint(target.instance, target.selectedPoint!, true);
      }
      target.visible = true;
    }
    this._state.set([...currentState]);
    // this.visible.set(!prev);
  }

  async setComparedTyphoons(ids: string[]) {
    const currentState = [...this._state()];
    for (let i = 0; i < currentState.length; i++) {
      const e = currentState[i];
      if (ids[i]) {
        const currentId = ids[i];
        if (!this.records[currentId]) {
          await this.fetchTyphoonPath(currentId);
        }
        const record = this.records[currentId]!;
        e.id = currentId;
        e.comparingPoints = record.keyFrames;
        e.instance.meta = record.meta;
        e.instance.updateName();
        e.selectedPoint = record.keyFrames[0] || null;
        e.exist = true;
        e.visible = true;
        this.setCurrentPoint(e.instance, e.selectedPoint!, true);
      } else {
        e.selectedPoint = null;
        e.exist = false;
        e.visible = false;
        e.instance.moveOut();
        e.instance.removeForecastLineLayerFake();
      }
    }
    this._state.set(currentState);
    this.compareChangeSubject$.next(this.currentComparingIds());
  }

  constructor(private readonly api: ApiService) {}

  async fetchHistoryTyphoons() {
    const res = await this.api.library.getCases('', '');
    this._historyTyphoons.set(res);
  }
  async fetchTyphoonPath(id: string) {
    const typhoonTableMeta = this.computedHistoryTyphoons().find(
      (t) => t.id === id,
    )!;
    const pathInfos = await this.api.manager.getPathInfos(
      typhoonTableMeta.name,
    );
    const rawWeatherEvents = await this.api.manager.getEvents(
      id,
      ActionCategory.weather,
    );
    const formattedPaths = transferPathInfosToTyphoonMeta(
      pathInfos,
      typhoonTableMeta.meta,
    );
    const map: ComparePoint[] = rawWeatherEvents.map((e) => {
      const dayjsDto = dayjs(e.fromDate);
      return {
        key: e._id,
        type: utils.getWeatherType(e),
        degree: utils.getWeatherColor(e),
        icon: utils.getWeatherAlertTypeNew(e),
        // rawEvent: e,
        formattedDateString: dayjsDto.format('YYYY-MM-DD HH:mm'),
        time: dayjsDto.format('HH:mm'),
        date: dayjsDto.format('MM-DD'),
        weatherText: e.items['类型'] + '预警',
        weatherColor: this.getTyphoonDegreeColor(e.items['等级']),
      };
    });
    this.setRecord(id, {
      ...typhoonTableMeta,
      keyFrames: map,
      meta: formattedPaths,
    });
  }

  getTyphoonDegreeColor(degreeText: string) {
    if (degreeText.indexOf('红色') !== -1) {
      return '#ef4444';
    } else if (degreeText.indexOf('橙色') !== -1) {
      return '#fb923c';
    } else if (degreeText.indexOf('黄色') !== -1) {
      return '#fde047';
    } else if (degreeText.indexOf('蓝色') !== -1) {
      return '#4C8AFD';
    } else {
      return '#aaaaaa';
    }
  }
}
