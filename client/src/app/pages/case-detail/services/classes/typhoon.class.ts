import { lineString, Position } from '@turf/turf';
import {
  divIcon,
  LatLngExpression,
  Map,
  Marker,
  marker,
  Polyline,
  polyline,
} from 'leaflet';
import 'proj4leaflet';
import { Subject } from 'rxjs';
import { getAnimationFrame } from '../../utils';
import { ITyphoonData, ITyphoonRadius } from '../meta';
import { TyphoonLayer } from '../typhoon.extends';
import { AutoPlayTask } from './autoplay.task.class';

const transparent = 'rgba(255, 255, 255, 0)';
const colorMap = [
  { color: '#3b82f6', fillColor: '#09BBFE' },
  { color: '#10b981', fillColor: '#6ee7b7' },
  { color: '#facc15', fillColor: '#fde68a' },
];

const getStyleOptions = (isEmpty: boolean, i: number) => ({
  color: isEmpty ? transparent : colorMap[i].color,
  fillColor: isEmpty ? transparent : colorMap[i].fillColor,
  fillOpacity: isEmpty ? 0 : 0.2,
  stroke: isEmpty ? false : true,
  weight: isEmpty ? 0 : 1,
});

type Point = [number, number];
const percentagePoint = (p1: Point, p2: Point, percentage: number): Point => {
  if (!p1 || !p2) {
    return [0, 0];
  }
  const dx = p2[0] - p1[0];
  const dy = p2[1] - p1[1];
  return [
    Number((p1[0] + dx * percentage).toFixed(9)),
    Number((p1[1] + dy * percentage).toFixed(9)),
  ];
};

function calculateDistance(point1: Point, point2: Point) {
  const xDistance = point2[0] - point1[0];
  const yDistance = point2[1] - point1[1];
  if (xDistance === 0 && yDistance === 0) {
    return 0;
  }
  return Math.hypot(xDistance, yDistance);
}

const percentageRadius = (
  r1: ITyphoonRadius,
  r2: ITyphoonRadius,
  percentage: number,
): ITyphoonRadius => {
  const d = {
    ne: r2.ne - r1.ne,
    se: r2.se - r1.se,
    sw: r2.sw - r1.sw,
    nw: r2.nw - r1.nw,
  };
  return {
    ne: r1.ne + d.ne * percentage,
    se: r1.se + d.se * percentage,
    sw: r1.sw + d.sw * percentage,
    nw: r1.nw + d.nw * percentage,
  };
};
const percentageRadiusArray = (
  r1: ITyphoonRadius[],
  r2: ITyphoonRadius[],
  percentage: number,
): ITyphoonRadius[] => {
  if (!r1 || !r2) {
    return [];
  }
  return r1.map((r, i) => {
    return percentageRadius(r, r2[i], percentage);
  });
};

export interface TyphoonOptions {
  meta: ITyphoonData;
  omitLine: boolean;
  historyLineColor?: string;
  forecastLineColor?: string;
  showName?: boolean;
  centerIconSize?: number;
  onStateUpdate?: (state: AnimationFrame) => void;
}

export interface AnimationFrame {
  center: [number, number];
  radius: ITyphoonRadius[];
  immediateTime?: number;
}

export interface AutoPlayPathPoint extends AnimationFrame {
  taskId?: string;
  time: string;
  duration: number;
  distanceFromLast: number;
  next?: AutoPlayPathPoint;
  prev?: AutoPlayPathPoint;
}
type AutoPlayPath = AutoPlayPathPoint[];

export class Typhoon {
  protected _mounted = false;
  protected _map?: Map;
  name: string;
  meta: ITyphoonData;
  centerIconSize = 30;
  layers: Polyline[]; // 三层风圈颜色
  centerLayer: Marker;
  lineLayer?: Polyline;
  forecastLineLayer?: Polyline;

  autoPlayPaths: AutoPlayPath = [];
  current: {
    state: AnimationFrame;
    index: number;
  };

  stateUpdateCallback?: (state: AnimationFrame) => void;
  $stateSubscription = new Subject<AnimationFrame>();
  animation: {
    animating: boolean;
    targetFrame?: AnimationFrame;
    targetPoint?: AutoPlayPathPoint;
    lastTargetPoint?: AutoPlayPathPoint;
    currentTaskId?: string;
    startTime: number;
    duration: number;
    perviousFrame: AnimationFrame | null;
    callback?: () => void;
    onTickDone?: (t: Typhoon) => void;
  };
  animationFrameTimer?: number;
  animationFrameFunc = getAnimationFrame();

  constructor({
    meta,
    onStateUpdate,
    centerIconSize,
    omitLine = false,
    historyLineColor,
    forecastLineColor,
    showName = false,
  }: TyphoonOptions) {
    this.name = meta?.name || '';
    this.meta = meta;
    this.centerIconSize =
      typeof centerIconSize === 'number' ? centerIconSize : 30;
    this.stateUpdateCallback = onStateUpdate;
    const index = 0;
    this.current = {
      state: meta.states[index],
      index,
    };
    this.animation = {
      animating: false,
      targetFrame: undefined,
      currentTaskId: undefined,
      startTime: 0,
      duration: 0,
      perviousFrame: null,
    };
    this.layers = this.getLayers();
    this.centerLayer = this.getCenterLayer(showName);
    !omitLine && (this.lineLayer = this.getLineLayer(historyLineColor));
    !omitLine &&
      (this.forecastLineLayer = this.getForecastLineLayer(forecastLineColor));
  }
  getLineLayer(color: string = 'rgba(255, 121, 198, 0.5)') {
    const options = {
      color: color,
      weight: 3,
      // color: '#00CFF8',
      dashArray: [6, 7],
    };
    if (!this.meta.states.length) return polyline([], options);
    const lines = lineString(this.meta.states.map((e) => e.center));
    return polyline(
      lines.geometry.coordinates as L.LatLngExpression[],
      options,
    );
  }
  getForecastLineLayer(color: string = 'rgba(121, 255, 178, 0.5)') {
    const options = {
      color: color,
      weight: 3,
      dashArray: [6, 7],
    };
    if (!this.meta.states.length) return polyline([], options);
    const lines = lineString([
      [0, 0],
      [1, 1],
    ]);
    return polyline(
      lines.geometry.coordinates as L.LatLngExpression[],
      options,
    );
  }
  updateLineLayer(
    states: Position[],
    color: string = 'rgba(255, 121, 198, 0.5)',
  ) {
    const lines = lineString(states);
    if (!this.lineLayer) {
      this.lineLayer = this.getLineLayer(color);
    }
    this.lineLayer?.setLatLngs(
      lines.geometry.coordinates as L.LatLngExpression[],
    );
  }
  updateForecastLineLayer(states: Position[]) {
    const lines = states.length
      ? lineString(states)
      : lineString([
          [0, 0],
          [1, 1],
        ]);
    this.forecastLineLayer?.setLatLngs(
      lines.geometry.coordinates as L.LatLngExpression[],
    );
  }
  removeForecastLineLayerFake() {
    this.updateForecastLineLayer([
      [0, 0],
      [0, 0],
    ]);
  }
  toggleLineLayer(visible: boolean) {
    if (this.lineLayer) {
      if (visible) {
        this.lineLayer.addTo(this._map!);
      } else {
        this._map?.removeLayer(this.lineLayer);
      }
    }
    if (this.forecastLineLayer) {
      if (visible) {
        this.forecastLineLayer.addTo(this._map!);
      } else {
        this._map?.removeLayer(this.forecastLineLayer);
      }
    }
  }
  getCenterLayer(withName: boolean) {
    if (withName) {
      return this.getCenterLayerWithName();
    }
    return this.getCenterLayerWithoutName();
  }
  updateName() {
    this.name = this.meta?.name || '';
    this.centerLayer.setIcon(this.getCenterLayer(true).getIcon());
  }
  getCenterLayerWithName() {
    const state = this.current.state;
    // if (!state) return marker([0, 0]);
    const center = (state?.center.slice() as LatLngExpression) || [0, 0];
    return marker(center, {
      icon: divIcon({
        html: `<div class="relative">
          <div class="absolute left-1/2 -translate-x-1/2 text-2xl text-red-500 text-nowrap" style="bottom: 36px;">
            ${this.name}
          </div>
          <div class="stroke-text animate-spin">
            <img src="assets/images/map/marker/typhoon.png" style="width: ${this.centerIconSize}px; height: ${this.centerIconSize}px;" />
          </div>
        </div>
        `,
        className: 'text-[#e3d3d3]',
        iconSize: [this.centerIconSize, this.centerIconSize],
      }),
    });
  }
  getCenterLayerWithoutName() {
    const state = this.current.state;
    // if (!state) return marker([0, 0]);
    const center = (state?.center.slice() as LatLngExpression) || [0, 0];
    return marker(center, {
      icon: divIcon({
        html: `<div class="stroke-text animate-spin">
       <img src="assets/images/map/marker/typhoon.png" style="width: ${this.centerIconSize}px; height: ${this.centerIconSize}px;" />
      </div>`,
        className: 'text-[#e3d3d3]',
        iconSize: [this.centerIconSize, this.centerIconSize],
      }),
    });
  }
  getLayers() {
    // ! 在 之前的 formatData 阶段，就要保证 radius.length === 3
    // let state = this.current.state;
    // if (!state) {
    let state = this.getEmptyFrame();
    // }
    const layers = state.radius.map((r, i) => {
      const isEmpty = !r.ne;
      return new TyphoonLayer(
        // @ts-ignore
        state.center.slice(),
        r,
        getStyleOptions(isEmpty, i),
      );
    });
    return layers;
  }
  setAutoPlayPath(tasks: AutoPlayTask[]) {
    this.autoPlayPaths = [];
    const taskPaths: AutoPlayPath = tasks.map((t) => {
      const { total, index } = t.sameTimeDto;
      const date = new Date(t.startTime);
      const continueTime = (index + 1) / total;
      const r = {
        ...this.getFrameByTime(date, continueTime)!,
        time: t.startTime,
        taskId: t.id,
        duration: 0,
        distanceFromLast: 0,
      };
      return r;
    });
    const originStatePaths: AutoPlayPath = this.meta.states.map((s) => {
      return {
        ...s,
        time: s.formattedTimeString,
        immediateTime: new Date(s.formattedTimeString).getTime(),
        taskId: '',
        duration: 0,
        distanceFromLast: 0,
      };
    });
    this.autoPlayPaths = [...taskPaths, ...originStatePaths].sort(
      // this.autoPlayPaths = [...taskPaths].sort(
      (a, b) => new Date(a.time).getTime() - new Date(b.time).getTime(),
    );
    for (let index = 0; index < this.autoPlayPaths.length; index++) {
      const p = this.autoPlayPaths[index];
      const last = this.autoPlayPaths[index - 1];

      p.next = this.autoPlayPaths[index + 1];
      p.prev = this.autoPlayPaths[index - 1];

      if (index !== 0) {
        if (!p.center || !last.center) {
          continue;
        }
        p.distanceFromLast = calculateDistance(p.center, last.center) || 0;
      }
    }
  }
  updateLayersWithFrame(frame: AnimationFrame) {
    this.layers.forEach((l, i) => {
      const isEmpty =
        !frame || !frame.radius || !frame.radius[i] || !frame.radius[i].ne;
      // @ts-ignore
      l.customUpdate(
        frame.center.slice(),
        frame.radius[i],
        getStyleOptions(isEmpty, i),
      );
    });
    this.centerLayer.setLatLng(frame.center);
    this.animation.perviousFrame = frame;
    this.stateUpdateCallback && this.stateUpdateCallback(frame);
    this.$stateSubscription.next(frame);
  }
  getFramePercentage(startTime: number, duration: number) {
    // const { startTime, duration } = this.autoAnimation;
    if (!startTime) return NaN;
    const now = new Date().getTime();
    const percentage = (now - startTime) / duration;
    if (percentage > 1 || percentage < 0) {
      return NaN;
    }
    return percentage;
  }
  cancelAnimation() {
    if (this.animationFrameTimer) {
      window.cancelAnimationFrame(this.animationFrameTimer);
      this.animationFrameTimer = undefined;
    }
  }
  getFrame(): AnimationFrame | undefined {
    const fromPoint = this.animation.lastTargetPoint;
    if (!fromPoint) return;
    const nextPoint = fromPoint.next;
    if (!nextPoint) return;
    const { startTime } = this.animation;
    const duration = nextPoint.duration;
    const percentage = this.getFramePercentage(startTime, duration);
    if (isNaN(percentage)) {
      this.animation.lastTargetPoint = nextPoint;
      this.animation.startTime = new Date().getTime();
      if (nextPoint === this.animation.targetFrame) {
        return;
      }
      return this.getFrame();
    }
    const pPoint = fromPoint!.center;
    const nPoint = nextPoint!.center;
    const pRadius = fromPoint.radius;
    const nRadius = nextPoint.radius;
    const ps = percentagePoint(pPoint, nPoint, percentage || 0);
    const rs = percentageRadiusArray(pRadius, nRadius, percentage || 0);
    return {
      center: ps,
      radius: rs,
      immediateTime: fromPoint.immediateTime
        ? fromPoint.immediateTime +
          (percentage || 1) *
            ((nextPoint?.immediateTime || 0) - (fromPoint?.immediateTime || 0))
        : 0,
    };
  }
  pauseAutoPlay() {
    this.cancelAnimation();
    this.animation.animating = false;
    const { perviousFrame, startTime } = this.animation;
    const next = this.animation.lastTargetPoint?.next;
    const duration = next?.duration || 0;
    this.animation.lastTargetPoint = {
      ...this.animation.lastTargetPoint!,
      ...perviousFrame,
    };
    const now = new Date().getTime();
    const remainingTime = duration - (now - startTime);
    next && (next.duration = remainingTime >= 0 ? remainingTime : 0);
  }
  resetDuration(duration: number) {
    this.animation.duration = duration;
    const currentTaskIndex = this.autoPlayPaths.findIndex(
      (p) => p.taskId === this.animation.currentTaskId,
    );
    if (currentTaskIndex === -1) return;
    const slice = this.autoPlayPaths.slice(
      this.autoPlayPaths.indexOf(this.animation.lastTargetPoint!),
      currentTaskIndex + 1,
    );
    this.setSlicePathDurations(slice, duration);
    this.pauseAutoPlay();
    this.resumeAutoPlay();
  }
  resumeAutoPlay() {
    this.animation.animating = true;
    this.animation.startTime = new Date().getTime();
    this.animateByTimeUpdate();
  }
  finishAutoPlay() {
    this.quitAutoPlay();
  }
  quitAutoPlay() {
    this.animation = {
      animating: false,
      targetFrame: undefined,
      startTime: 0,
      duration: 0,
      perviousFrame: null,
    };
    this.moveOut();
  }
  animateByTask({
    taskId,
    duration,
    onDone,
    onTickDone,
  }: {
    taskId: string;
    duration: number;
    onDone: () => void;
    onTickDone?: (t: Typhoon) => void;
  }) {
    const pointIndex = this.autoPlayPaths.findIndex((p) => p.taskId === taskId);
    if (pointIndex === -1) return;
    const point = this.autoPlayPaths[pointIndex];
    const lastPoint = this.autoPlayPaths
      .slice(0, pointIndex)
      .reverse()
      .find((p) => !!p.taskId && p.taskId !== point.taskId);
    this.animation.lastTargetPoint = lastPoint;

    if (!this.animation.lastTargetPoint) {
      this.animation.lastTargetPoint = this.autoPlayPaths[0];
    }
    this.animation.targetFrame = point;
    this.animation.duration = duration;
    this.animation.currentTaskId = taskId;
    this.animation.startTime = new Date().getTime();
    this.animation.callback = onDone;
    this.animation.onTickDone = onTickDone || undefined;

    const slice = this.autoPlayPaths.slice(
      this.autoPlayPaths.indexOf(this.animation.lastTargetPoint),
      pointIndex + 1,
    );
    this.setSlicePathDurations(slice, duration);

    this.animateByTimeUpdate();
  }
  setSlicePathDurations(path: AutoPlayPath, totalDuration: number) {
    if (path.length === 0 || path.length === 1) {
      return;
    }
    if (path.length === 2) {
      path[1].duration = totalDuration;
      return;
    }
    const total = path.reduce((acc, p, i) => {
      if (i === 0) return acc;
      return acc + p.distanceFromLast;
    }, 0);
    for (let index = 0; index < path.length - 1; index++) {
      const p = path[index + 1];
      p.duration = (totalDuration * p.distanceFromLast) / total || 0;
    }
  }
  animateByTimeUpdate() {
    this.animationFrameTimer = this.animationFrameFunc(
      this.animateToTargetTask.bind(this),
    ) as unknown as number;
  }
  animateToTargetTask() {
    const frame = this.getFrame();
    if (!frame) {
      // this.animation.targetFrame = undefined;
      this.animation.startTime = 0;
      this.animation.animating = false;
      typeof this.animation.callback === 'function' &&
        this.animation.callback();
    } else {
      this.updateLayersWithFrame(frame);
      typeof this.animation.onTickDone === 'function' &&
        this.animation.onTickDone(this);
      this.animateByTimeUpdate();
    }
  }
  getFrameByTime(time: Date, percent = 1) {
    const states = this.meta.states;
    const index = states.findIndex((s, i) => {
      if (!states[i + 1]) return false;
      return s.time <= time && time < states[i + 1].time;
    });
    const target = states[index];
    const next = states[index + 1];
    const last = states[index - 1];
    if (!target) return;
    const percentage =
      1 -
      (next.time.getTime() - time.getTime()) /
        (next.time.getTime() - target.time.getTime());
    if (percentage !== 0) {
      if (next) {
        const center = percentagePoint(
          target.center,
          next.center,
          percentage * percent,
        );
        const radius = percentageRadiusArray(
          target.radius,
          next.radius,
          percentage * percent,
        );
        return {
          center,
          radius: radius.map((r) => this.getProtectRadius(r)),
          immediateTime:
            time.getTime() +
            (next.time.getTime() - time.getTime()) * percentage * percent,
        };
      }
    } else {
      if (last) {
        const center = percentagePoint(last.center, target.center, percent);
        const radius = percentageRadiusArray(
          last.radius,
          target.radius,
          percent,
        );
        return {
          center,
          radius: radius.map((r) => this.getProtectRadius(r)),
          immediateTime:
            time.getTime() + (time.getTime() - last.time.getTime()) * percent,
        };
      }
    }

    return target;
  }
  getProtectRadius(radius: ITyphoonRadius) {
    return {
      ne: radius.ne || 0.0001,
      se: radius.se || 0.0001,
      sw: radius.sw || 0.0001,
      nw: radius.nw || 0.0001,
    };
  }
  locateByTime(time: Date) {
    const frame = this.getFrameByTime(time);
    if (frame) {
      this.updateLayersWithFrame(frame);
    }
    return frame;
  }
  autoPlayLocateByTime(taskId: string) {
    // const frame = this.locateByTime(time);
    const pointIndex = this.autoPlayPaths.findIndex((p) => p.taskId === taskId);
    if (pointIndex === -1) return;
    const frame = this.autoPlayPaths[pointIndex];
    if (frame) {
      this.animation.perviousFrame = frame;
    }
  }
  getEmptyFrame(): AnimationFrame {
    return {
      center: [0, 0],
      radius: [
        {
          ne: 0.0001,
          se: 0.0001,
          sw: 0.0001,
          nw: 0.0001,
        },
        {
          ne: 0.0001,
          se: 0.0001,
          sw: 0.0001,
          nw: 0.0001,
        },
        {
          ne: 0.0001,
          se: 0.0001,
          sw: 0.0001,
          nw: 0.0001,
        },
      ],
    };
  }
  moveOut() {
    this.cancelAnimation();
    this.updateLayersWithFrame(this.getEmptyFrame());
  }
  setWindCircleVisible(b: boolean) {
    if (b) {
      this.layers.forEach((l) => l.addTo(this._map!));
      this.centerLayer.addTo(this._map!);
    } else {
      this.layers.forEach((l) => this._map!.removeLayer(l));
      this._map!.removeLayer(this.centerLayer);
    }
  }
  mount(map: Map) {
    if (!this._map) {
      this._mounted = true;
      this.lineLayer && this.lineLayer.addTo(map);
      this.forecastLineLayer && this.forecastLineLayer.addTo(map);
      this.layers.forEach((l) => l.addTo(map));
      this.centerLayer.addTo(map);
      this._map = map;
    }
  }
  unmount(map: Map) {
    if (this._map) {
      this._mounted = false;
      this.layers.forEach((l) => map.removeLayer(l));
      map.removeLayer(this.centerLayer);
      this._map = undefined;
    }
  }
  followState(otherModel: Typhoon) {
    if (otherModel.$stateSubscription) {
      otherModel.$stateSubscription.subscribe((state) => {
        this.updateLayersWithFrame(state);
      });
    }
  }
  getCoord() {
    return this.centerLayer.getLatLng();
  }
  get hasMounted() {
    return this._mounted;
  }
  getLandingTime() {
    const infoStates = this.meta.states.filter((s) => s.info);
    const landState = infoStates.find((s) => s.info!.indexOf('上海') !== -1);
    if (landState) {
      return new Date(landState.time).getTime();
    }
    return 0;
  }
}
