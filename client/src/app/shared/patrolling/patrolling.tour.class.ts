import dayjs from 'dayjs';
import { getAnimationFrame } from '../../pages/case-detail/utils';
import { SvgGroup, SvgPolyline } from './d3.utils';
import {
  findMetaByIdentifier,
  getCornerKey,
  getPartialPathFromEdge,
  getPartialPathFromInner,
  getPointsString,
  getPositionPoint,
  getStationPath,
  recalculateDistance,
  Reverse,
  separateConnections,
} from './patrolling.utils';
import { trainSvgString } from './svg.string';

const pathColors = [
  '#60a5fa',
  '#fde047',
  '#2dd4bf',
  '#c084fc',
  '#4ade80',
  '#fb923c',
  '#f472b6',
  '#4338ca',
  '#a3e635',
  '#f43f5e',
];
const getTrainPathColor = (num: number) => pathColors[num % 10];
const getTrainPathFinishedColor = (num: number) => pathColors[num % 10] + '99';

export interface PatrollingTourParams {
  isTemporary?: boolean;
  tourGroup?: SvgGroup;
  meta: PatrollingType.TourDto;
  lineMeta: PatrollingType.LineMeta;
}

interface ConnectionRenderRecord {
  progress: number;
  pendingPart: PatrollingType.Point[][];
  finishedPart: PatrollingType.Point[][];
  pendingSvg?: SvgPolyline[];
  finishedSvg?: SvgPolyline[];
}

interface TimeStep {
  isTurnaround: boolean; // 是掉头步骤
  consume: number; // 步骤耗时
  breakPoint: number;
  progress: number; // 步骤进度  0 -100=
  targetPath?: PatrollingType.CombinedTopologyPath;
}

type TrainState = 'pending' | 'running' | 'turning' | 'finished';

export const TURNAROUND_TIME_CONSUMPTION = 3 * 60; // unit second

const connectionHoverStroke = '#50f376';
// const connectionFinishedStroke = '#ffffff';
// const connectionPendingStroke = '#FFDD00';

export default class PatrollingTour {
  isTemporary: boolean = false;
  meta: PatrollingType.TourDto;
  lineMeta: PatrollingType.LineMeta;
  originTourMeta: (PatrollingType.Station | PatrollingType.Corner)[] = [];
  paths: PatrollingType.CombinedTopologyPath[][] = [];
  timeSteps: TimeStep[] = [];
  // number = 1; // 1号车
  tourGroup?: SvgGroup;
  svg?: SvgGroup;
  trainSvg?: SvgGroup;
  connectionMap = new Map<
    PatrollingType.CombinedTopologyPath,
    ConnectionRenderRecord
  >();

  animationFrameTimer?: number;
  animationFrameFunc = getAnimationFrame();

  hovering = false;

  constructor({
    meta,
    lineMeta,
    isTemporary,
    tourGroup,
  }: PatrollingTourParams) {
    this.isTemporary = !!isTemporary;
    this.meta = meta;
    this.tourGroup = tourGroup;
    this.lineMeta = lineMeta;
    this.originTourMeta = this.getOriginMeta(meta.identifiers, lineMeta);
    this.paths = this.getPaths(this.originTourMeta, lineMeta);
    this.initTimeSteps();
    this.initConnectionMap();
  }
  getOriginMeta(identifiers: string[], lineMeta: PatrollingType.LineMeta) {
    const { stations, corners } = lineMeta;
    return identifiers.map((identifier) => {
      return findMetaByIdentifier(identifier, stations, corners)!;
    });
  }

  getPaths(
    originTourMeta: (PatrollingType.Station | PatrollingType.Corner)[],
    lineMeta: PatrollingType.LineMeta,
  ) {
    const paths: PatrollingType.CombinedTopologyPath[][] = [];
    for (let index = 1; index < originTourMeta.length; index++) {
      const last = originTourMeta[index - 1];
      const current = originTourMeta[index];
      if (current.type === 'station') {
        if (last.type === 'station') {
          // current type == station
          paths.push(
            this.getPathFromStationToStation(
              last as PatrollingType.Station,
              current as PatrollingType.Station,
              lineMeta,
            ),
          );
        } else {
          // last type == corner
          // current type == station
          paths.push(
            this.getPathFromCornerToStation(
              last as PatrollingType.Corner,
              current as PatrollingType.Station,
              lineMeta,
            ),
          );
        }
      } else {
        // current type == corner
        if (last.type === 'station') {
          paths.push(
            this.getPathFromStationToCorner(
              last as PatrollingType.Station,
              current as PatrollingType.Corner,
              lineMeta,
            ),
          );
        } else {
          // last type == corner
          // current type == corner
          break;
        }
      }
    }
    return paths.map((plist) =>
      plist.map((p) =>
        recalculateDistance(p, lineMeta.presetCombinedTopologyPath),
      ),
    );
  }

  initTimeSteps() {
    const steps: TimeStep[] = [];
    this.paths.forEach((path, index) => {
      if (index !== 0) {
        if (path[0].direction !== this.paths[index - 1][0].direction) {
          steps.push({
            isTurnaround: true,
            consume: TURNAROUND_TIME_CONSUMPTION,
            breakPoint: 0,
            progress: 0,
          });
        }
      }
      path.forEach((p) => {
        steps.push({
          isTurnaround: false,
          consume: this.getStepPathConsume(p),
          progress: 0,
          breakPoint: 0,
          targetPath: p,
        });
      });
    });
    this.timeSteps = steps;
    this.resetBreakPoints();
  }
  resetBreakPoints() {
    let acc = 0;
    this.timeSteps.forEach((step) => {
      step.breakPoint = acc;
      acc += step.consume;
    });
  }
  initConnectionMap() {
    this.paths.forEach((path) => {
      path.forEach((p) => {
        const progress = 0;
        const [finishedPart, pendingPart] = separateConnections(
          p.connections.map((c) => c.points),
          progress,
        );
        this.connectionMap.set(p, {
          progress,
          finishedPart: finishedPart,
          pendingPart: pendingPart,
          pendingSvg: undefined,
          finishedSvg: undefined,
        });
      });
    });
  }
  updateTimeStepsConsume() {
    this.timeSteps.forEach((step) => {
      if (!step.isTurnaround) {
        step.consume = this.getStepPathConsume(step.targetPath!);
      }
    });
    this.resetBreakPoints();
  }
  updateTimeStepsProgress() {
    const state = this.getTrainState();
    switch (state) {
      case 'pending':
        this.updateTimeStepsProgressPending();
        break;
      case 'finished':
        this.updateTimeStepsProgressFinished();
        break;
      default:
        this.updateTimeStepsProgressRunning();
        break;
    }
  }
  updateTimeStepsProgressPending() {
    this.timeSteps.forEach((st) => (st.progress = 0));
  }
  updateTimeStepsProgressFinished() {
    this.timeSteps.forEach((st) => (st.progress = 100));
  }
  updateTimeStepsProgressRunning() {
    const expiredSeconds = this.getExpireTime() / 1000;
    this.timeSteps.forEach((step) => {
      const endBreak = step.breakPoint + step.consume;
      if (expiredSeconds < step.breakPoint) {
        step.progress = 0;
        return;
      }
      if (expiredSeconds > endBreak) {
        step.progress = 100;
        return;
      }
      const currentExpired = expiredSeconds - step.breakPoint;
      step.progress = (currentExpired / step.consume) * 100;
    });
  }

  updateConnectionMap() {
    this.timeSteps.forEach((step) => {
      if (step.targetPath) {
        const record = this.connectionMap.get(step.targetPath);
        if (record) {
          const [finishedPart, pendingPart] = separateConnections(
            step.targetPath.connections.map((c) => c.points),
            step.progress,
          );
          record.progress = step.progress;
          record.finishedPart = finishedPart;
          record.pendingPart = pendingPart;
        }
      }
    });
    this.updatePaths();
  }
  updateTourProgress() {
    this.updateTimeStepsProgress();
    this.updateConnectionMap();
    this.updateTrainPosition();
    if (this.getTrainState() === 'finished') {
      this.updateEndMarker();
      this.cancelAnimation();
    } else {
      this.updateStartMarker();
      this.animateByTimeUpdate();
    }
  }

  exec() {
    this.init();
    this.render();
    this.updateTourProgress();
    this.animateByTimeUpdate();
  }

  animateByTimeUpdate() {
    this.animationFrameTimer = this.animationFrameFunc(
      this.updateTourProgress.bind(this),
    ) as unknown as number;
  }

  static getPathFromCornerToStation(
    from: PatrollingType.Corner,
    to: PatrollingType.Station,
    lineMeta: PatrollingType.LineMeta,
  ): PatrollingType.CombinedTopologyPath[] {
    const allPaths = lineMeta.presetCombinedTopologyPath;
    const fromCorner = Reverse.getReverseCorner(from, lineMeta.corners);
    const { fromNameKey, toNameKey } = getCornerKey(fromCorner);
    const isNeighboring =
      to.nameKey === toNameKey || to.nameKey === fromNameKey;
    if (isNeighboring) {
      const oppositeStationNameKey =
        to.nameKey === toNameKey ? fromNameKey : toNameKey;
      const matchedPath = allPaths.find(
        (p) => p.to === to.nameKey && p.from === oppositeStationNameKey,
      );
      if (matchedPath) {
        return [getPartialPathFromInner(matchedPath, fromCorner.center)];
      }
      return [];
    }
    const stationOne = lineMeta.stations.find((s) => s.nameKey === fromNameKey);
    const stationTwo = lineMeta.stations.find((s) => s.nameKey === toNameKey);
    if (stationOne && stationTwo) {
      const pathOne = getStationPath(stationOne, to, allPaths);
      const pathTwo = getStationPath(stationTwo, to, allPaths);
      const actualSupportPath =
        pathOne.length > pathTwo.length ? pathOne : pathTwo;
      const matched = actualSupportPath.shift();
      return [
        getPartialPathFromInner(matched!, fromCorner.center),
        ...actualSupportPath,
      ];
    } else if (stationOne || stationTwo) {
      const onlyKey = fromNameKey || toNameKey;
      const entirePath = getStationPath(
        stationOne || stationTwo!,
        to,
        allPaths,
      );
      const forward = entirePath[0]?.forward;
      if (forward === undefined) return [];
      const matched = allPaths.find(
        (p) => !p.from && p.to === onlyKey && p.forward === forward,
      );
      if (matched) {
        return [
          getPartialPathFromInner(matched!, fromCorner.center),
          ...entirePath,
        ];
      }
    }
    return [];
  }
  static getPathFromStationToStation(
    from: PatrollingType.Station,
    to: PatrollingType.Station,
    lineMeta: PatrollingType.LineMeta,
  ): PatrollingType.CombinedTopologyPath[] {
    const paths = getStationPath(
      from,
      to,
      lineMeta.presetCombinedTopologyPath,
      lineMeta.proximityPrinciple,
    );
    return paths;
  }
  static getPathFromStationToCorner(
    from: PatrollingType.Station,
    to: PatrollingType.Corner,
    lineMeta: PatrollingType.LineMeta,
  ): PatrollingType.CombinedTopologyPath[] {
    const allPaths = lineMeta.presetCombinedTopologyPath;
    const { fromNameKey, toNameKey } = getCornerKey(to);
    const isNeighboring =
      from.nameKey === toNameKey || from.nameKey === fromNameKey;
    if (isNeighboring) {
      const oppositeStationNameKey =
        from.nameKey === toNameKey ? fromNameKey : toNameKey;
      const matchedPath = allPaths.find(
        (p) => p.from === from.nameKey && p.to === oppositeStationNameKey,
      );
      if (matchedPath) {
        return [getPartialPathFromEdge(matchedPath, to.center)];
      }
      return [];
    }
    const stationOne = lineMeta.stations.find((s) => s.nameKey === fromNameKey);
    const stationTwo = lineMeta.stations.find((s) => s.nameKey === toNameKey);
    if (stationOne && stationTwo) {
      const pathOne = getStationPath(from, stationOne, allPaths);
      const pathTwo = getStationPath(from, stationTwo, allPaths);
      const actualSupportPath =
        pathOne.length > pathTwo.length ? pathOne : pathTwo;
      const matched = actualSupportPath.pop();

      return [
        ...actualSupportPath,
        getPartialPathFromEdge(matched!, to.center),
      ];
    } else {
      const onlyKey = fromNameKey || toNameKey;
      const matched = allPaths.find((p) => !p.to && p.from === onlyKey);
      if (matched) {
        return [
          ...getStationPath(
            from,
            lineMeta.stations.find((s) => s.nameKey === onlyKey)!,
            allPaths,
          ),
          getPartialPathFromEdge(matched!, to.center),
        ];
      }
    }
    return [];
  }
  getPathFromCornerToStation(
    from: PatrollingType.Corner,
    to: PatrollingType.Station,
    lineMeta: PatrollingType.LineMeta,
  ): PatrollingType.CombinedTopologyPath[] {
    return PatrollingTour.getPathFromCornerToStation(from, to, lineMeta);
  }
  getPathFromStationToStation(
    from: PatrollingType.Station,
    to: PatrollingType.Station,
    lineMeta: PatrollingType.LineMeta,
  ): PatrollingType.CombinedTopologyPath[] {
    return PatrollingTour.getPathFromStationToStation(from, to, lineMeta);
  }
  getPathFromStationToCorner(
    from: PatrollingType.Station,
    to: PatrollingType.Corner,
    lineMeta: PatrollingType.LineMeta,
  ): PatrollingType.CombinedTopologyPath[] {
    return PatrollingTour.getPathFromStationToCorner(from, to, lineMeta);
  }

  init() {
    this.svg = this.tourGroup
      ?.append('g')
      .attr('class', 'tour')
      .attr('data-id', this.meta.id);
  }
  render() {
    this.renderEndMarker();
    this.renderStartMarker();
    this.renderPaths();
    this.renderTrain();
  }

  renderTrain() {
    const p = this.getCurrentTrainPosition();
    const isToRight = this.isCurrentTrainToRight();
    const train = this.svg
      ?.append('g')

      .attr('class', 'train')
      .attr('style', `transform: ${this.getTrainTransform(p, isToRight)}`)
      .html(trainSvgString);

    train
      ?.append('text')
      .attr('class', 'train-speed-text')
      .attr('fill', '#FFDD00')
      .attr('transform', this.getTrainTextTransform(isToRight))
      .attr('style', 'font-size: 44px;')
      .text(this.getTrainText());

    this.svg
      ?.append('text')
      .attr('class', 'train-number-text')
      .attr('fill', '#B70000')
      .attr('transform', this.getTrainNumberTextTransform(p, isToRight))
      .attr('style', 'font-size: 8px;')
      .text(`${this.number}号`);
    this.trainSvg = train;
  }
  getTrainText() {
    switch (this.getTrainState()) {
      case 'turning':
        return '正在掉头';
      case 'running':
        return `${this.meta.speed}km/h`;
      default:
        return '';
    }
  }
  getTrainTransform(p: PatrollingType.Point, toRight: boolean = false) {
    const scale = 0.2;
    const x = toRight ? p.x + (330 / 2) * scale : p.x - (330 / 2) * scale;
    const y = p.y - 100 * scale;
    return `translate(${x}px, ${y - 2}px) scale(${toRight ? -scale : scale}, ${scale});`;
  }

  getTrainTextTransform(toRight: boolean = false) {
    return `translate(${toRight ? 250 : 80}, 8) scale(${toRight ? -1 : 1}, 1)`;
  }
  getTrainNumberTextTransform(
    p: PatrollingType.Point,
    toRight: boolean = false,
  ) {
    return `translate(${toRight ? p.x - 24 : p.x + 10}, ${p.y - 7})`;
  }
  updateTrainSvg(p: PatrollingType.Point, toRight: boolean = false) {
    const state = this.getTrainState();
    this.trainSvg?.classed(
      'hidden',
      state === 'pending' || state === 'finished',
    );
    this.trainSvg?.attr(
      'style',
      `transform: ${this.getTrainTransform(p, toRight)}`,
    );
    const trainSpeedText = this.trainSvg
      ?.select('.train-speed-text')
      .attr('transform', this.getTrainTextTransform(toRight));

    if (trainSpeedText?.attr('state') !== state) {
      trainSpeedText?.attr('state', state).text(this.getTrainText());
    }

    this.svg
      ?.select('.train-number-text')
      .classed('hidden', state === 'pending' || state === 'finished')
      .attr('transform', this.getTrainNumberTextTransform(p, toRight));
  }

  updateTrainPosition() {
    const p = this.getCurrentTrainPosition();
    const isToRight = this.isCurrentTrainToRight();
    this.updateTrainSvg(p, isToRight);
  }

  renderPaths() {
    const records = this.connectionMap.values();
    for (const record of records) {
      this.renderPath(record);
    }
  }
  renderPath(record: ConnectionRenderRecord) {
    const { pendingPart, finishedPart } = record;
    record.pendingSvg = pendingPart.map((ps) =>
      this.getPendingConnectionPart(ps),
    );
    record.finishedSvg = finishedPart.map((ps) =>
      this.getFinishedConnectionPart(ps),
    );
  }
  updatePaths() {
    const records = this.connectionMap.values();
    for (const record of records) {
      this.updatePath(record);
    }
  }
  updatePath(record: ConnectionRenderRecord) {
    const { pendingSvg, pendingPart, finishedSvg, finishedPart } = record;
    pendingPart.forEach((ps, i) =>
      this.updateConnectionPart(pendingSvg![i], ps),
    );
    finishedPart.forEach((ps, i) =>
      this.updateConnectionPart(finishedSvg![i], ps),
    );
  }

  getFinishedConnectionPart(points: PatrollingType.Point[]) {
    const { lineWidth } = this.lineMeta;
    const path = getPointsString(points);
    const svg = this.svg!.append('polyline')
      .attr('class', 'finished-connection')
      .attr('points', path)
      .attr('fill', 'none')
      .attr('stroke', getTrainPathFinishedColor(this.meta.serialNumber))
      .attr('stroke-opacity', 0.75)
      .attr('stroke-width', lineWidth)
      .attr('stroke-linejoin', 'round')
      .attr('stroke-linecap', 'round')
      .attr('stroke-miterlimit', 10);
    return svg;
  }

  updateConnectionPart(polyline: SvgPolyline, points: PatrollingType.Point[]) {
    const path = getPointsString(points);
    polyline.attr('points', path);
  }
  getPendingConnectionPart(points: PatrollingType.Point[]) {
    const { lineWidth } = this.lineMeta;
    const path = getPointsString(points);
    const svg = this.svg!.append('polyline')
      .attr('class', 'pending-connection')
      .attr('points', path)
      .attr('fill', 'none')
      .attr('stroke', getTrainPathColor(this.meta.serialNumber))
      .attr('stroke-opacity', 1)
      .attr('stroke-width', lineWidth)
      .attr('stroke-linejoin', 'round')
      .attr('stroke-linecap', 'round')
      .attr('stroke-miterlimit', 10);
    return svg;
  }

  setHovering() {
    this.hovering = true;
    this.svg
      ?.selectAll('.finished-connection')
      .attr('stroke', connectionHoverStroke)
      .attr('stroke-opacity', 1);

    this.svg
      ?.selectAll('.pending-connection')
      .attr('stroke', connectionHoverStroke)
      .attr('stroke-opacity', 1);
  }
  setBlur() {
    this.hovering = false;
    this.svg
      ?.selectAll('.finished-connection')
      .attr('stroke', getTrainPathFinishedColor(this.meta.serialNumber))
      .attr('stroke-opacity', 0.75);

    this.svg
      ?.selectAll('.pending-connection')
      .attr('stroke', getTrainPathColor(this.meta.serialNumber))
      .attr('stroke-opacity', 1);
  }

  private addHoverEffect(
    element: d3.Selection<SVGGElement, unknown, null, undefined>,
  ) {
    element
      .on('mouseover', () => {
        this.raise();
        this.setHovering();
      })
      .on('mouseout', () => {
        this.setBlur();
      });
  }

  renderStartMarker() {
    const { center: point, direction } = this.startStation;
    const state = this.getTrainState();
    const scale = 0.18;
    const height = 110;

    const { transform, pathD, textX, textY } = this.getStartMarkerProperties(
      height,
      scale,
      point,
      state,
      direction,
    );
    // 创建分组元素来包含标记的所有部分
    const marker = this.svg!.append('g')
      .attr('class', 'start-marker cursor-pointer')
      .attr('state', state)
      .attr('transform', transform);
    marker
      .append('path')
      .attr('fill', '#B2DFF2')
      .attr('d', pathD)
      .attr('stroke-width', 2)
      .attr('stroke', '#317DB9')
      .attr('stroke-miterlimit', 10);
    marker
      .append('circle')
      .attr('fill', '#317DB9')
      .attr('r', 52.7)
      .attr('cy', 55)
      .attr('cx', 55.9);

    marker
      .append('text')
      .attr('x', 28)
      .attr('y', 73)
      .attr('font-size', 52)
      .attr('fill', '#FFFFFF')
      .text('始');

    const text = this.svg
      ?.append('text')
      .attr('fill', '#317DB9')
      .attr('x', textX)
      .attr('y', textY)
      .classed('start-marker-text pointer-events-none', true)
      .style('font-size', '10px')
      .text(this.getStartMarkerText(state));

    this.addHoverEffect(marker);
    return marker;
  }
  raise() {
    this.svg?.raise();
  }
  renderEndMarker() {
    const { center: point, direction } = this.endStation;
    const state = this.getTrainState();
    const scale = 0.18;
    const height = 110;

    const { transform, pathD, textX, textY } = this.getEndMarkerProperties(
      height,
      scale,
      point,
      state,
      direction,
    );
    // 创建分组元素来包含标记的所有部分
    const marker = this.svg!.append('g')
      .attr('class', 'end-marker cursor-pointer')
      .attr('state', state)
      .attr('transform', transform);
    marker
      .append('path')
      .attr('fill', '#F2DF93')
      .attr('d', pathD)
      .attr('stroke-width', 2)
      .attr('stroke', '#EFA715')
      .attr('stroke-miterlimit', 10);
    marker
      .append('circle')
      .attr('fill', '#EFA715')
      .attr('r', 52.7)
      .attr('cy', 55)
      .attr('cx', 55.9);

    marker
      .append('text')
      .attr('x', 28)
      .attr('y', 73)
      .attr('font-size', 52)
      .attr('fill', '#FFFFFF')
      .text('终');

    const text = this.svg
      ?.append('text')
      .attr('fill', '#EFA715')
      .attr('x', textX)
      .attr('y', textY)
      .classed('end-marker-text pointer-events-none', true)
      .style('font-size', '10px')
      .text(this.getEndMarkerText(state));

    this.addHoverEffect(marker);
    return marker;
  }
  getEndMarkerProperties(
    height: number,
    scale: number,
    point: PatrollingType.Point,
    state: TrainState,
    direction: 'up' | 'down',
  ) {
    const width = state === 'finished' ? 660 : 762;
    const x = point.x - (width / 2) * scale;
    const y =
      direction === 'down'
        ? point.y - (height + 1) * scale
        : point.y + (height - 24) * scale;

    function getPathD(width: number) {
      return `m${width},107.45l-${width - 55.8},0c-29.1,0 -52.7,-23.6 -52.7,-52.7l0,0c0,-29.1 23.6,-52.7 52.7,-52.7l${width - 55.7},0c29.1,0 52.7,23.6 52.7,52.7l0,0c0.1,29.1 -23.5,52.7 -52.6,52.7z`;
    }
    return {
      x,
      y,
      transform: `translate(${x}, ${y - 8}) scale(${scale})`,
      pathD: getPathD(width),
      textX: x + 120 * scale,
      textY: y + height * scale * 0.27,
    };
  }

  getStartMarkerProperties(
    height: number,
    scale: number,
    point: PatrollingType.Point,
    state: TrainState,
    direction: 'up' | 'down',
  ) {
    const width = state === 'pending' ? 640 : 266;
    const x = point.x - (width / 2) * scale;
    const y =
      direction === 'down'
        ? point.y - (height + 1) * scale
        : point.y + (height - 24) * scale;

    function getPathD(width: number) {
      return `m${width},107.45l-${width - 55.8},0c-29.1,0 -52.7,-23.6 -52.7,-52.7l0,0c0,-29.1 23.6,-52.7 52.7,-52.7l${width - 55.7},0c29.1,0 52.7,23.6 52.7,52.7l0,0c0.1,29.1 -23.5,52.7 -52.6,52.7z`;
    }
    return {
      x,
      y,
      transform: `translate(${x}, ${y - 8}) scale(${scale})`,
      pathD: getPathD(width),
      textX: x + 120 * scale,
      textY: y + height * scale * 0.27,
    };
  }

  updateEndMarker() {
    const endMarker = this.svg?.select('.end-marker');
    if (!endMarker) return;
    const state = this.getTrainState();
    if (endMarker.attr('state') === state) return;
    endMarker.attr('state', state);
    const { center: point, direction } = this.endStation;
    const scale = 0.18;
    const height = 110;

    const { textX, textY, transform, pathD } = this.getEndMarkerProperties(
      height,
      scale,
      point,
      state,
      direction,
    );
    endMarker.transition().attr('transform', transform);
    endMarker.select('path').transition().attr('d', pathD);
    this.svg
      ?.select('.end-marker-text')
      .transition()
      .attr('x', textX)
      .attr('y', textY)
      .text(this.getEndMarkerText(state));
  }
  updateStartMarker() {
    const startMarker = this.svg?.select('.start-marker');
    if (!startMarker) return;
    const state = this.getTrainState();
    if (startMarker.attr('state') === state) return;
    startMarker.attr('state', state);
    const { center: point, direction } = this.startStation;
    const scale = 0.18;
    const height = 110;

    const { textX, textY, transform, pathD } = this.getStartMarkerProperties(
      height,
      scale,
      point,
      state,
      direction,
    );
    startMarker.transition().attr('transform', transform);
    startMarker.select('path').transition().attr('d', pathD);
    this.svg
      ?.select('.start-marker-text')
      .transition()
      .attr('x', textX)
      .attr('y', textY)
      .text(this.getStartMarkerText(state));
  }
  getMarker(
    point: { x: number; y: number },
    color: string,
    singleChar: string,
  ) {
    const scale = 0.15;
    let offset = 70;
    if (!Number.isNaN(parseInt(singleChar))) {
      offset = parseInt(singleChar) < 10 ? 80 : 60;
    }
    const x = point.x - (131 / 4) * 3 * scale;
    const y = point.y - (175 + 45) * scale;
    // 创建分组元素来包含标记的所有部分
    const marker = this.svg!.append('g')
      .attr('class', 'locate-marker')
      .attr('transform', `translate(${x}, ${y - 8}) scale(${scale})`);
    marker
      .append('path')
      .attr(
        'd',
        'M154.2,115.2c0.1-0.1,0.1-0.3,0.3-0.4l0.1-0.1c20.1-30.1,12.1-70.8-18-91 c-10.8-7.2-23.5-11.1-36.5-11.1c-36.3,0-65.7,29.3-65.7,65.6c0,13,3.8,25.7,11.1,36.4l0.1,0.1c0.1,0.1,0.1,0.3,0.3,0.4L94,184.3  c0,0.1,0.1,0.1,0.1,0.1h0v0.1c1.4,1.8,3.5,2.9,5.8,2.9c2.3,0,4.4-1.1,5.8-2.9l0.1-0.3L154.2,115.2z M99.9,27.8  c27.7,0,50.3,22.6,50.3,50.3s-22.6,50.3-50.3,50.3s-50.3-22.6-50.3-50.3S72.3,27.8,99.9,27.8z',
      )
      .attr('fill', color);
    marker
      .append('text')
      .attr('transform', `matrix(1 0 0 1 ${offset} 100.0001)`)
      .attr('fill', color)
      .attr('font-size', 64)
      .text(singleChar);

    marker
      .transition()
      .attr('transform', `translate(${x}, ${y}) scale(${scale})`);

    return marker;
  }

  getTotalStepDistance(step: PatrollingType.CombinedTopologyPath[]) {
    return step.reduce((acc, p) => acc + p.distance, 0);
  }
  setStartTime(time: string) {
    const startTime = new Date(time);
    this.meta.startTime = startTime;
  }
  setSpeed(speed: number) {
    this.meta.speed = speed;
    this.updateTimeStepsConsume();
    this.updateStartMarker();
    this.updateEndMarker();
    this.trainSvg?.select('text').text(`${speed}km/h`);
  }

  getExpireTime() {
    const current = new Date();
    return current.getTime() - this.meta.startTime.getTime();
  }
  getEndMarkerText(state: TrainState) {
    // const state = this.getTrainState();
    return `${this.number}号车${state === 'finished' ? '' : '预计'}到达时间: ${dayjs(this.endDate).format('HH:mm')}`;
  }
  getStartMarkerText(state: TrainState) {
    const tranText = `${this.number}号车`;
    return state === 'pending'
      ? `${tranText}预计${dayjs(this.meta.startTime).format('HH:mm')}出发`
      : tranText;
  }
  isCurrentTrainToRight() {
    const trainState = this.getTrainState();
    switch (trainState) {
      case 'pending':
        return this.isPathToRight(this.paths[0][0]);
      case 'finished':
        return this.isPathToRight(this.paths[this.paths.length - 1][0]);
      default:
        return this.isTrainRunningToRight();
    }
  }
  isPathToRight(p: PatrollingType.CombinedTopologyPath) {
    const { direction, forward } = p;
    if (direction === 'up' && forward) return true;
    if (direction === 'down' && !forward) return true;
    return false;
  }

  getCurrentTrainPosition() {
    const trainState = this.getTrainState();
    switch (trainState) {
      case 'pending':
        return this.startPosition;
      case 'finished':
        return this.endPosition;
      default:
        return this.getTrainRunningPosition();
    }
  }

  getTrainRunningPosition(): PatrollingType.Point {
    const runningTimeStepIndex = this.timeSteps.findIndex(
      (step) => step.progress !== 0 && step.progress !== 100,
    );
    if (runningTimeStepIndex === -1) return this.startPosition;
    const step = this.timeSteps[runningTimeStepIndex];
    const lastStep = this.timeSteps[runningTimeStepIndex - 1];
    if (step.isTurnaround) {
      // 正在掉头
      if (!lastStep || !lastStep.targetPath) return this.startPosition;
      const cs = lastStep.targetPath.connections;
      const points = cs[cs.length - 1].points;
      return points[points.length - 1];
    } else {
      if (!step.targetPath) return this.startPosition;
      const point = getPositionPoint(
        step.targetPath!.connections.flat().map((c) => c.points),
        step.progress,
      );
      return point;
    }
  }
  getProcessingStep() {
    return this.timeSteps.find(
      (step) => step.progress !== 0 && step.progress !== 100,
    );
  }
  isTrainRunningToRight() {
    const runningTimeStepIndex = this.timeSteps.findIndex(
      (step) => step.progress !== 0 && step.progress !== 100,
    );
    if (runningTimeStepIndex === -1) return false;
    const step = this.timeSteps[runningTimeStepIndex];
    const lastStep = this.timeSteps[runningTimeStepIndex - 1];
    if (step.isTurnaround) {
      // 正在掉头
      if (!lastStep || !lastStep.targetPath) return false;
      return this.isPathToRight(lastStep.targetPath);
    } else {
      if (!step.targetPath) return false;
      return this.isPathToRight(step.targetPath);
    }
  }

  getTrainState(): TrainState {
    const current = new Date();
    const startDate = this.meta.startTime;
    if (current < startDate) return 'pending';
    const endDate = this.endDate;
    if (current > endDate) return 'finished';
    const step = this.getProcessingStep();
    if (!step) {
      return 'running';
    }
    return step.isTurnaround ? 'turning' : 'running';
  }

  getStepPathConsume(p: PatrollingType.CombinedTopologyPath) {
    const { speed } = this.meta;
    const metreSecond = (speed * 1000) / 3600;
    const distance = p.distance;
    return distance / metreSecond;
  }

  get startStation() {
    return this.originTourMeta[0];
  }
  get endStation() {
    return this.originTourMeta[this.originTourMeta.length - 1];
  }
  get startPosition() {
    return this.startStation.center;
  }
  get endPosition() {
    return this.endStation.center;
  }

  get totalDistance() {
    return this.paths.reduce((acc, p) => acc + this.getTotalStepDistance(p), 0);
  }

  // get totalDistanceKilo() {
  //   return Math.floor(this.totalDistance / 1000);
  // }

  // 掉头次数
  get turnaroundTime() {
    return this.originTourMeta.reduce((acc, cur, i, arr) => {
      if (i === 0) return 0;
      if (cur.direction !== arr[i - 1].direction) {
        return acc + 1;
      }
      return acc;
    }, 0);
  }

  get endDate() {
    const speed = this.meta.speed;
    const startDate = this.meta.startTime;
    const endDate = new Date(
      startDate.getTime() + this.getEstimateSecond(speed) * 1000,
    );
    return endDate;
  }

  get number() {
    return this.meta.serialNumber;
  }

  getEstimateSecond(speed: number) {
    if (!speed) return 0; // km/h
    const metreSecond = (speed * 1000) / 3600;
    return (
      Math.floor(this.totalDistance / metreSecond) +
      this.turnaroundTime * TURNAROUND_TIME_CONSUMPTION
    );
  }

  cancelAnimation() {
    if (this.animationFrameTimer) {
      window.cancelAnimationFrame(this.animationFrameTimer);
      this.animationFrameTimer = undefined;
    }
  }
  destroy() {
    this.cancelAnimation();
    this.svg?.remove();
  }
}
