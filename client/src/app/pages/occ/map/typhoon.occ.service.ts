import { Injectable } from '@angular/core';
import {
  booleanContains,
  booleanOverlap,
  distance,
  lineIntersect,
  lineString,
  point,
  polygon,
  Position,
} from '@turf/turf';
import dayjs from 'dayjs';

import {
  getDummyTyphoonSimulateStartTime,
  getDummyTyphoonSource,
} from '../../../../dummy/typhoon.source';
import { ActionDto } from '../../../domain/action.dto';
import { ITyphoonRadius, ITyphoonState } from '../../case-detail/services/meta';
import { UtilsService } from '../../case-detail/services/utils.service';
import { TyphoonCompareService } from '../../dispatch-center/map/typhoon.compare.service';
import { ApiService } from './../../../services/api.service';
import { Typhoon } from './../../case-detail/services/classes/typhoon.class';
import { MapService } from './../../case-detail/services/map.service';
import { CommandService } from './command.service';

export function getTendencyKeyword(infoString: string) {
  if (infoString.indexOf('强度变化不大') !== -1) {
    return '维持';
  } else if (infoString.indexOf('强度逐渐增强') !== -1) {
    return '逐渐增强';
  } else if (infoString.indexOf('强度逐渐减弱') !== -1) {
    return '逐渐减弱';
  } else if (infoString.indexOf('强度缓慢增强') !== -1) {
    return '缓慢增强';
  } else if (infoString.indexOf('强度缓慢减弱') !== -1) {
    return '缓慢减弱';
  }
  return '-';
}
const percentagePoint = (
  p1: Position,
  p2: Position,
  percentage: number,
): [number, number] => {
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

const percentageTime = (d1: Date, d2: Date, percentage: number): Date => {
  if (!d1 || !d2) {
    return new Date();
  }
  const dis = d2.getTime() - d1.getTime();
  return new Date(d1.getTime() + dis * percentage);
};

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

const nearBooleanContains = (
  line: [Position, Position],
  point: Position,
): boolean => {
  const epsilon = 1e-8; // 可根据需要调整误差范围

  const p1 = line[0];
  const p2 = line[1];

  const dx = p2[0] - p1[0];
  const dy = p2[1] - p1[1];
  const l2 = dx * dx + dy * dy;

  // 处理线段退化为点的情况
  if (l2 === 0) {
    if (Math.hypot(point[0] - p1[0], point[1] - p1[1]) < epsilon) return true;
  }

  // 计算投影参数t
  const t = ((point[0] - p1[0]) * dx + (point[1] - p1[1]) * dy) / l2;
  const tClamped = Math.max(0, Math.min(1, t)); // 将t限制在[0,1]区间

  // 计算投影点坐标
  const projX = p1[0] + tClamped * dx;
  const projY = p1[1] + tClamped * dy;

  // 计算点与投影点的距离平方
  const distSq = (point[0] - projX) ** 2 + (point[1] - projY) ** 2;

  // 判断距离是否在允许误差内
  if (distSq < epsilon * epsilon) return true;

  return false;
};

@Injectable({
  providedIn: 'root',
})
export class OccTyphoonService {
  typhoonModel?: Typhoon;
  name = '';
  enName = '';
  unitKey = '';

  simulate?: {
    source: ExternalTyphoonWeb.TyphoonData;
    startTime: string;
  };
  actual?: {
    source: ExternalTyphoonWeb.TyphoonData;
    startTime: string;
  };
  // typhoonMeta: ITyphoonMeta;

  constructor(
    private api: ApiService,
    private mapService: MapService,
    private readonly utils: UtilsService,
    private readonly commandService: CommandService,
    private compareService: TyphoonCompareService,
  ) {}

  get command() {
    return this.commandService.command;
  }

  /**
   * 指挥名称（来源：typhoonCommand/info 的 name 字段）。
   * 可能是真实台风名，也可能是无台风时弹框输入的自定义名称。
   * 大屏显示时不再依赖能否匹配到真实台风。
   */
  get commandName() {
    return this.command?.name ?? '';
  }

  mount(model: Typhoon) {
    this.typhoonModel = model;
  }
  setup() {
    const name = this.command.name;
    if (this.isSimulation) {
      if (!name) return;
      const source = getDummyTyphoonSource(name);
      this.simulate = {
        source,
        startTime: this.command.simulateStartTime
          ? dayjs(this.command.simulateStartTime).format('YYYY-MM-DD HH:mm:ss')
          : getDummyTyphoonSimulateStartTime(name),
      };
      this.name = source.name;
      this.enName = source.enname;
      this.unitKey = source.tfid;
    } else {
      this.fetchTyphoonData();
    }
  }

  async fetchTyphoonData() {
    const list = await this.api.extreme.getTyphoonList();
    const targetTyphoon = list.find((t) => t.name === this.command.name);
    if (targetTyphoon) {
      this.actual = {
        source: targetTyphoon,
        startTime: targetTyphoon.starttime,
      };
      this.name = targetTyphoon.name;
      this.enName = targetTyphoon.enname;
      this.unitKey = targetTyphoon.tfid;
    } else {
      this.actual = undefined;
    }
  }

  simulateActions: ActionDto[] = [];

  findTyphoonBackendId(unitKey: string) {
    return this.compareService
      .computedHistoryTyphoons()
      .find((h) => h.unitKey === unitKey)?.id;
  }

  async getCurrentSimulateWeather(): Promise<
    {
      type: string;
      degree: string;
      src: string;
      publishTime: string;
    }[]
  > {
    if (!this.isSimulation) return [];
    if (!this.compareService.computedHistoryTyphoons().length) {
      await this.compareService.fetchHistoryTyphoons();
    }
    const backendId = this.findTyphoonBackendId(this.unitKey);
    if (!backendId) return [];
    if (!this.simulateActions.length) {
      this.simulateActions = await this.api.manager.getEvents(backendId, '');
      this.utils.setRawEvents(this.simulateActions);
    }

    const time = this.simulateCurrentTime.toDate();
    const ws = this.utils.getWeatherEventsWithCertainTime(
      this.utils.formatTimeString(time),
    );

    const weatherMarkers = ws
      .map((w) => {
        const type = this.utils.getWeatherType(w);
        const degree = this.utils.getWeatherColor(w);
        return {
          type,
          degree,
          src: this.weatherMarkerPrefix + type + '-' + degree + '.png',
          publishTime: this.utils.formatTimeString(w.fromDate),
        };
      })
      .filter((w) => w.type !== 'unknown');

    return weatherMarkers;
  }
  private readonly weatherMarkerPrefix =
    'assets/images/map/weather-alert/' as const;

  getCurrentTyphoonFrame():
    | {
        frame: ITyphoonState;
        previousStates: ITyphoonState[];
        forecastStates: ITyphoonState[];
      }
    | undefined {
    if (!this.command) return undefined;
    if (this.isSimulation) {
      return this.getSimulateState();
    } else {
      return this.getActualState();
    }
  }
  getSimulateState() {
    if (!this.simulate) return undefined;
    const currentSimulateStartTime = this.simulateCurrentTime;
    const states = this.transformTyphoonPointsToTyphoonStates(
      this.simulate.source.points,
    );
    const { state: closestTyphoonState, states: typhoonStates } =
      this.findClosestTyphoonState(currentSimulateStartTime, states);
    return {
      frame: closestTyphoonState,
      previousStates: typhoonStates,
      forecastStates: [],
    };
  }
  getForecastStates() {
    if (!this.actual) return [];
    const ps = this.actual.source.points;
    const lastState = ps[ps.length - 1];
    if (!lastState || !lastState.forecast || !lastState.forecast.length)
      return [];
    const ourForecast = lastState.forecast.find((f) => f.tm === '中国');
    if (!ourForecast) return [];
    return this.transformTyphoonPointsToTyphoonStates(
      ourForecast.forecastpoints.map((f) => ({
        ...lastState,
        ...f,
      })),
    );
  }
  getActualState() {
    if (!this.actual) return undefined;
    const ps = this.actual.source.points;
    const states = this.transformTyphoonPointsToTyphoonStates(ps);
    const lastState = states[states.length - 1];
    const forecastStates = this.getForecastStates();
    return {
      frame: lastState,
      previousStates: states,
      forecastStates: forecastStates,
    };
  }
  getPredictPath() {
    if (this.isSimulation) {
      if (!this.simulate) return [];
      const states = this.transformTyphoonPointsToTyphoonStates(
        this.simulate.source.points,
      );
      const currentSimulateStartTime = this.simulateCurrentTime;
      const predictStates = states.filter(
        (s) => s.time > currentSimulateStartTime.toDate(),
      );
      if (!predictStates.length) return [];
      const lastStateIndex = states.findIndex((s) => s === predictStates[0]);
      const lastState = states[lastStateIndex - 1];
      const predictPaths = lastState
        ? [lastState, ...predictStates]
        : predictStates;
      return predictPaths;
    }
    return this.getForecastStates();
  }

  findPredictLandingInfo() {
    if (!this.command) return undefined;
    const predictPaths = this.getPredictPath();
    if (!predictPaths.length) return undefined;
    const closeFrame = this.getCurrentTyphoonFrame();
    if (!closeFrame) return undefined;
    var intersects = lineIntersect(
      this.mapService.detailBoundaryPolygon,
      lineString(predictPaths.map((s) => s.center)),
    );
    if (!intersects.features.length) {
      return undefined;
    }
    const closestPoint = this.findClosestPoint(
      closeFrame.frame.center,
      intersects.features.map((f) => f.geometry.coordinates),
    );
    const closeState = this.findPredictFrame(closestPoint, predictPaths);
    if (!closeState) return undefined;
    if (closeState.time.getTime() < Date.now()) {
      // 时间点过去了，不显示
      return undefined;
    }
    return {
      landingPoint: closestPoint,
      landingState: closeState,
    };
  }

  findPredictOverlayInfo() {
    if (!this.command) return undefined;

    // 先检查当前帧是否已覆盖上海
    const current = this.getCurrentTyphoonFrame();
    if (current?.frame && this.isTyphoonCircleOverlayShanghai(current.frame)) {
      return current.frame;
    }

    const predictPaths = this.getPredictPath();
    if (!predictPaths.length) return undefined;
    const separatedStates = this.separateStatesByMinutes(predictPaths);
    for (const s of separatedStates) {
      const overlaid = this.isTyphoonCircleOverlayShanghai(s);
      if (overlaid) return s;
    }

    return undefined;
  }

  separateStatesByMinutes(states: ITyphoonState[], minutes = 5) {
    const unSeparated: ITyphoonState[][] = [];
    for (let index = 1; index < states.length; index++) {
      const last = states[index - 1];
      const cur = states[index];
      unSeparated.push([last, cur]);
    }
    const separated: ITyphoonState[] = [];
    unSeparated.forEach(([from, to], index) => {
      separated.push(this.transformToRealTimeState(from));

      const diff = this.differenceInMinutes(to.time, from.time);
      if (diff > minutes) {
        const pointCount = this.getSeparatePointCount(diff, minutes);
        Array.from({ length: pointCount }).forEach((_, index) => {
          const curTime = dayjs(from.time).add((index + 1) * minutes, 'minute');
          const timePercentage =
            (curTime.toDate().getTime() - from.time.getTime()) /
            (to.time.getTime() - from.time.getTime());
          const frame = this.getPercentageFrame(from, to, timePercentage);
          const transferFrame = this.transformToRealTimeState(frame);
          separated.push(transferFrame);
        });
      }
      if (index === unSeparated.length - 1) {
        separated.push(this.transformToRealTimeState(to));
      }
    });
    return separated;
  }

  differenceInMinutes(end: Date, start: Date) {
    return dayjs(end).diff(dayjs(start), 'minute');
  }
  getSeparatePointCount(diff: number, minutes: number) {
    const count = Math.floor(diff / minutes) - 1;
    const last = diff % minutes > 0 ? 1 : 0;
    const points = count + last;
    return points;
  }

  findClosestPoint(target: Position, fromPoints: Position[]) {
    var to = point(target);
    return fromPoints.reduce((prev, cur) => {
      return distance(point(prev), to) > distance(point(cur), to) ? cur : prev;
    });
  }

  findPredictFrame(position: Position, predictPaths: ITyphoonState[]) {
    // predictPaths 切分为短路径
    const shorts: ITyphoonState[][] = [];
    for (let index = 1; index < predictPaths.length; index++) {
      const last = predictPaths[index - 1];
      const cur = predictPaths[index];
      shorts.push([last, cur]);
    }
    var turfPoint = point(position);
    let targetShort: ITyphoonState[] | undefined;
    for (const short of shorts) {
      if (nearBooleanContains([short[0].center, short[1].center], position)) {
        // 寻找在某个区间
        if (
          !booleanContains(
            this.mapService.detailBoundaryPolygon!,
            point(short[0].center as Position),
          )
        ) {
          // 该区间出发点必须在上海该区域外
          targetShort = short;
          break;
        }
      }
    }
    if (!targetShort) return undefined;
    const [fromState, toState] = targetShort;
    const [fromPoint, toPoint] = targetShort.map((s) => point(s.center));
    const distancePercentage =
      distance(turfPoint, fromPoint) / distance(fromPoint, toPoint);
    const percentageFrame = this.getPercentageFrame(
      fromState,
      toState,
      Math.min(distancePercentage, 1),
    );
    const transferFrame = this.transformToRealTimeState(percentageFrame);
    return transferFrame;
  }

  getPercentageFrame(
    from: ITyphoonState,
    to: ITyphoonState,
    percentage: number,
  ): ITyphoonState {
    const center = percentagePoint(from.center, to.center, percentage);
    const predictDate = percentageTime(from.time, to.time, percentage);
    return {
      ...from,
      center,
      radius: percentageRadiusArray(from.radius, to.radius, percentage),
      lat: center[0],
      lon: center[1],
      time: predictDate,
      timeString: dayjs(predictDate).format('MM-DD HH:mm'),
      formattedTimeString: dayjs(predictDate).format('YYYY/MM/DD HH:mm:ss'),
      durationFromLastState: 0,
    };
  }
  transformToRealTimeState(state: ITyphoonState): ITyphoonState {
    const time = this.transformToRealTime(state.time);
    return {
      ...state,
      time: time,
      timeString: dayjs(time).format('MM-DD HH:mm'),
      formattedTimeString: dayjs(time).format('YYYY/MM/DD HH:mm:ss'),
      durationFromLastState: 0,
    };
  }

  findClosestTyphoonState(time: dayjs.Dayjs, states: ITyphoonState[]) {
    const closestTyphoonState = states.reduce((prev, current) => {
      return Math.abs(dayjs(current.time).diff(time, 'minutes')) <
        Math.abs(dayjs(prev.time).diff(time, 'minutes'))
        ? current
        : prev;
    }, states[0]);
    const index = states.findIndex((s) => s.time === closestTyphoonState.time);
    return {
      state: closestTyphoonState,
      states: states.slice(0, index + 1),
    };
  }
  transformTyphoonPointsToTyphoonStates(
    points: ExternalTyphoonWeb.TyphoonPoint[],
  ): ITyphoonState[] {
    const states: ITyphoonState[] = [];
    let hasRadiusIndex = -1;
    for (let i = 0; i < points.length; i++) {
      const point = points[i];
      const lastPointHasRadius = points[hasRadiusIndex];
      const state = this.transformTyphoonPointToTyphoonState(
        point,
        lastPointHasRadius,
      );
      if (point.radius7 || point.radius10 || point.radius12) {
        hasRadiusIndex = i;
      }
      states.push(state);
    }
    return states;
  }
  transformTyphoonPointToTyphoonState(
    point: ExternalTyphoonWeb.TyphoonPoint,
    previousPoint?: ExternalTyphoonWeb.TyphoonPoint,
  ): ITyphoonState {
    return {
      center: [parseFloat(point.lat), parseFloat(point.lng)],
      lon: parseFloat(point.lng),
      lat: parseFloat(point.lat),
      time: dayjs(point.time).toDate(),
      timeString: point.time,
      formattedTimeString: dayjs(point.time).format('YYYY/MM/DD HH:mm:ss'),
      durationFromLastState: 0,
      speed: parseFloat(point.speed),
      level: parseFloat(point.power),
      strong: point.strong || '',
      centerPressure: parseFloat(point.pressure),
      radius: [
        this.transformTyphoonRadiusToTyphoonRadius(
          point.radius7 || previousPoint?.radius7 || '',
        ),
        this.transformTyphoonRadiusToTyphoonRadius(
          point.radius10 || previousPoint?.radius10 || '',
        ),
        this.transformTyphoonRadiusToTyphoonRadius(
          point.radius12 || previousPoint?.radius12 || '',
        ),
      ],
      radiusText: '',
      info:
        (point.ckposition && point.ckposition.split(' ').filter(Boolean)[0]) ||
        '',
      power: point.power,
      tendency: point.jl || '',
      direction: point.movedirection,
    };
  }
  // getLandingInfoText(p?: string) {
  //   if (!p) return '';
  //   return p.split(' ').filter(Boolean)[0];
  // }
  transformTyphoonRadiusToTyphoonRadius(radius: string): ITyphoonRadius {
    if (!radius) return { ne: 0, se: 0, sw: 0, nw: 0 };
    return {
      ne: parseFloat(radius.split('|')[0]),
      se: parseFloat(radius.split('|')[1]),
      nw: parseFloat(radius.split('|')[2]),
      sw: parseFloat(radius.split('|')[3]),
    };
  }
  getCommandDuration() {
    return Date.now() - dayjs(this.commandStartTime).valueOf();
  }
  getSimulateDuration() {
    if (!this.simulate) return 0;
    return dayjs(this.simulate.startTime).add(this.getCommandDuration());
  }
  transformToRealTime(predict: Date) {
    if (this.isSimulation) {
      if (!this.simulate) return predict;
      const duration =
        predict.getTime() - new Date(this.simulate.startTime).getTime();
      return new Date(new Date(this.commandStartTime).getTime() + duration);
    }
    return predict;
  }

  getTyphoonCircleFeature(state: ITyphoonState) {
    const centerPoint = state.center.slice();
    const maxRadius = state.radius[0];
    const { ne, se, sw, nw } = maxRadius;
    return [
      this.generateSector(centerPoint, ne * 1000, 90, 180),
      this.generateSector(centerPoint, se * 1000, 0, 90),
      this.generateSector(centerPoint, sw * 1000, 270, 360),
      this.generateSector(centerPoint, nw * 1000, 180, 270),
    ];
  }
  generateSector(
    center: Position,
    radius: number,
    startAngle: number,
    endAngle: number,
    points = 32,
  ) {
    const angleDiff =
      endAngle > startAngle
        ? endAngle - startAngle
        : endAngle + 360 - startAngle;
    const sectorCoords: Position[] = [];

    // 添加圆心点（闭合路径时需要）
    sectorCoords.push(center);

    // 生成圆弧上的点
    for (let i = 0; i <= points; i++) {
      const angle = startAngle + (angleDiff * i) / points;
      // 将角度转换为弧度（正北方向为0°，顺时针）
      const radians = (angle - 90) * (Math.PI / 180); // -90° 调整，使0°对应正北

      // 计算偏移量（单位：米）
      const dx = radius * Math.cos(radians);
      const dy = radius * Math.sin(radians);

      // 将米转换为经纬度偏移
      const earthRadius = 6378137; // 地球赤道半径（米）
      const deltaLng = (dx / earthRadius) * (180 / Math.PI); // 经度偏移
      const deltaLat = (dy / earthRadius) * (180 / Math.PI); // 纬度偏移

      // 生成点坐标
      const point = [center[0] + deltaLat, center[1] + deltaLng];
      sectorCoords.push(point);
    }

    // 闭合路径（最后一个点连接回圆心）
    sectorCoords.push(center);
    return sectorCoords;
  }

  isTyphoonCircleOverlayShanghai(state: ITyphoonState) {
    const boundary = this.mapService.detailBoundaryPolygon;
    if (!boundary) return false;
    const sectorCoords = this.getTyphoonCircleFeature(state);
    return sectorCoords.some((coords) => {
      const sector = polygon([coords]);
      return booleanOverlap(sector, boundary) || booleanContains(sector, boundary);
    });
  }

  getTendencyKeyword(infoString: string) {
    return getTendencyKeyword(infoString);
  }

  /** 将过去时间转为模拟时间 */
  convertToSimulateTime(time: Date) {
    const s = this.simulateCurrentTime;
    const distance = time.getTime() - s.valueOf();
    return dayjs().add(distance);
  }

  get commandStartTime() {
    return this.command.startTime;
  }

  get isSimulation() {
    if (!this.command) return false;
    return this.command.isSimulated;
  }
  get simulateCurrentTime() {
    if (!this.simulate) return dayjs();
    return dayjs(this.simulate.startTime).add(this.getCommandDuration());
  }

  get actualCurrentTime() {
    return dayjs();
  }
}
