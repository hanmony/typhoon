import * as d3 from 'd3';
import { Svg, SvgGroup } from './d3.utils';
import { PatrollingCorner } from './patrolling.corner.class';
import { PatrollingStation } from './patrolling.station.class';
import PatrollingTour from './patrolling.tour.class';
import {
  calculateSvgElementRealSize,
  deconstructConnections,
  getConnectionPointsString,
  getIdentifierString,
  getOppositeDirection,
} from './patrolling.utils';

export interface PatrollingLineParams {
  name: string;
  meta: PatrollingType.LineMeta;
  maxWidth?: number;
  maxHeight?: number;
}

export class PatrollingLine {
  name: string;
  // 线路元数据，包含线路的宽度、高度、svg字符串等信息，用于绘制线路图
  meta: PatrollingType.LineMeta;

  svg?: Svg;
  rootGroup!: SvgGroup;
  markerGroup!: SvgGroup;
  tourGroup!: SvgGroup;
  cacheConnectionGroup!: SvgGroup;
  pathGroup!: SvgGroup;
  wrapper: {
    width: number;
    height: number;
  };

  stationModels: PatrollingStation[] = [];
  cornerModels: PatrollingCorner[] = [];
  // 添加缩放相关属性
  private readonly minZoom = 0.5;
  private readonly maxZoom = 2;
  private zoom?: d3.ZoomBehavior<SVGSVGElement, unknown>;
  // 在类的顶部添加新的属性
  private currentScale = 1;
  private readonly hoverFill = 'rgba(255, 255, 255, 0.2)';
  private readonly normalFill = 'rgba(255, 255, 255, 0.1)';
  private readonly disabledFill = 'rgba(255, 255, 255, 0.05)';

  picking = false;
  pickupCallback?: (tour: PatrollingTour) => void;
  cachePickupMarkers: {
    data: PatrollingType.Station | PatrollingType.Corner;
    svg: SvgGroup;
  }[] = [];
  cacheTour?: {
    start?: PatrollingType.Station;
    via: (PatrollingType.Station | PatrollingType.Corner)[];
    confirmStart: boolean;
  };
  tours: PatrollingTour[] = [];
  constructor(p: PatrollingLineParams) {
    this.meta = p.meta;
    this.name = p.name;
    this.wrapper = {
      width: p.maxWidth || 1196,
      height: p.maxHeight || 819,
    };
  }
  showMessage = (message: string) => {};
  queryMessageConfirm = (b: boolean) => {};
  getSvgWrapper(dom: HTMLElement) {
    const { width, height } = this.meta.preset;
    const svg = d3.select(dom).append('svg');
    svg
      .attr('width', this.wrapper.width)
      .attr('xmlns', 'http://www.w3.org/2000/svg')
      .attr('xmlns:xlink', 'http://www.w3.org/1999/xlink')
      .attr('height', this.wrapper.height)
      .attr('viewBox', `0 0 ${width} ${height}`)
      .attr('preserveAspectRatio', 'xMidYMid meet')
      .attr('xml:space', 'preserve');
    return svg;
  }
  updateWrapper(rect: { width: number; height: number }) {
    this.wrapper.width = rect.width;
    this.wrapper.height = rect.height;
  }
  bootstrap(dom: HTMLElement) {
    const svg = this.getSvgWrapper(dom);
    // 创建一个根 group 元素来包含所有地铁线路内容
    this.renderDefs(svg);
    const rootGroup = svg.append('g');
    rootGroup.attr('class', 'rootGroup');

    this.svg = svg;
    this.rootGroup = rootGroup;
    this.renderOther();
    this.renderPolylines();
    this.renderArrows();
    this.renderTourGroup();
    this.renderStations();
    this.renderCorners();
    this.renderMarkerGroup();
    this.renderCacheConnectionGroup();
    this.initializeZoom();
    // 添加缩放工具条，放在最下
    // this.renderZoomTool();
  }
  renderDefs(svg: Svg) {
    svg.append('defs').html(`
      <linearGradient  id="train-linear-gradient" gradientUnits="userSpaceOnUse" x1="100" y1="110.619" x2="100" y2="297.0732">
	<stop offset="0" style="stop-color:#FFFFFF"/>
	<stop offset="0.2705" style="stop-color:#1B9AFF"/>
</linearGradient>
<path id="train-defs-1" d="m150.4 88.2l-136.8,0c-4.4,0 -7.9,-3.5 -7.9,-7.9l0,0c0,-35.9 29.1,-65 65,-65l80.8,0c3.7,0 6.8,3 6.8,6.8l0,58.3c0,4.3 -3.5,7.8 -7.9,7.8z" />
     <clipPath id="train-defs-2">
     <use xlink:href="#train-defs-1"/>
    </clipPath>
      `);
  }
  renderOther() {
    this.rootGroup
      ?.append('g')
      .attr('class', 'otherGroup')
      .html(this.meta.preset.svgString);
  }
  renderTourGroup() {
    const tourGroup = this.rootGroup!.append('g');
    tourGroup.attr('class', 'tourGroup');
    this.tourGroup = tourGroup;
  }
  renderArrows() {
    const { arrowString } = this.meta.preset;
    const arrowGroup = this.rootGroup!.append('g');
    arrowGroup.attr('class', 'arrowGroup');
    arrowGroup.html(arrowString);
  }
  renderPolylines() {
    const { connections, lineWidth } = this.meta;
    const pathGroup = this.rootGroup!.append('g');
    pathGroup.attr('class', 'pathGroup');
    const polylineGroup = pathGroup
      .selectAll('polyline')
      .data(connections)
      .join('polyline')
      .attr('from', (d) => d.from)
      .attr('to', (d) => d.to)
      .attr('points', (d) => getConnectionPointsString(d))
      .attr('fill', 'none')
      .attr('stroke', '#429255') // #9232e5 429255
      .attr('stroke-width', lineWidth)
      .attr('stroke-miterlimit', 10);
  }
  renderStations() {
    const { stations, lineWidth } = this.meta;
    const stationGroup = this.rootGroup!.append('g');
    stationGroup.attr('class', 'stationGroup');

    this.stationModels = stations.map(
      (s) =>
        new PatrollingStation({
          meta: s,
          radius: lineWidth,
          stationGroup,
          onClick: this.stationClickHandler.bind(this),
        }),
    );
    this.stationModels.forEach((s) => s.render());
  }
  renderCorners() {
    const { corners, lineWidth } = this.meta;
    const cornerGroup = this.rootGroup!.append('g');
    cornerGroup.attr('class', 'cornerGroup');

    this.cornerModels = corners.map(
      (s) =>
        new PatrollingCorner({
          meta: s,
          radius: lineWidth,
          cornerGroup,
          onClick: this.cornerClickHandler.bind(this),
        }),
    );
    this.cornerModels.forEach((s) => s.render());
  }
  renderMarkerGroup() {
    const markerGroup = this.rootGroup!.append('g');
    markerGroup.attr('class', 'markerGroup');
    this.markerGroup = markerGroup;
  }
  renderCacheConnectionGroup() {
    const cacheConnectionGroup = this.rootGroup!.append('g');
    cacheConnectionGroup.attr('class', 'cacheConnectionGroup');
    this.cacheConnectionGroup = cacheConnectionGroup;
  }
  clearCacheConnectionGroup() {
    this.cacheConnectionGroup?.selectAll('polyline').remove();
  }
  setStationAndCornerVisibilityByDirection(direction: 'up' | 'down') {
    this.stationModels.forEach((s) => {
      s.setVisibility(s.direction === direction);
    });
    this.cornerModels.forEach((c) => {
      c.setVisibility(c.direction === direction);
    });
  }
  setStationVisible() {
    this.stationModels.forEach((s) => s.setVisibility(true));
  }
  setCornerInvisible() {
    this.cornerModels.forEach((c) => c.setVisibility(false));
  }

  pickupTour(callback: (tour: PatrollingTour) => void) {
    this.picking = true;
    this.cacheTour = {
      start: undefined,
      via: [],
      confirmStart: false,
    };
    this.showMessage('请选择起始站点');
    this.setLocationMode();
    this.pickupCallback = callback;
  }
  onMessageConfirm() {
    if (this.cacheTour?.start && !this.cacheTour.confirmStart) {
      this.cacheTour.confirmStart = true;
      setTimeout(() => {
        this.showMessage('请选择途经点/结束站点');
        this.setPickingVia();
      }, 300);
    } else {
      const identifiers = this.cachePickupMarkers.map((e) =>
        getIdentifierString(e.data),
      );
      const tour = new PatrollingTour({
        tourGroup: this.tourGroup,
        isTemporary: true,
        meta: {
          line: this.meta.name,
          identifiers,
          startTime: new Date(),
          speed: 25,
          id: '',
          createTime: new Date(),
          serialNumber: 0,
        },
        lineMeta: this.meta,
      });
      // console.log(tour);
      this.pickupCallback && this.pickupCallback(tour);
    }
  }
  exitPickupTour() {
    this.picking = false;
    this.clearCacheTour();
    this.clearCacheConnectionGroup();
    this.exitLocationMode();
  }
  addTours(tours: PatrollingType.TourDto[]) {
    tours.forEach((t) => this.addTour(t));
  }
  addTour(tour: PatrollingType.TourDto) {
    const tourInstance = new PatrollingTour({
      tourGroup: this.tourGroup,
      isTemporary: false,
      meta: {
        line: tour.line,
        identifiers: tour.identifiers,
        startTime: new Date(tour.startTime),
        speed: tour.speed,
        id: tour.id,
        serialNumber: tour.serialNumber,
        createTime: new Date(tour.createTime),
      },
      lineMeta: this.meta,
    });
    this.tours.push(tourInstance);
    tourInstance.exec();
  }
  removeTours(tours: PatrollingType.TourDto[]) {
    tours.forEach((t) => this.removeTour(t));
  }
  removeTour(tour: PatrollingType.TourDto) {
    const targetIndex = this.tours.findIndex((t) => t.meta.id === tour.id);
    if (targetIndex === -1) return;
    const tourInstance = this.tours.splice(targetIndex, 1)[0];
    tourInstance.destroy();
  }
  setPickingVia() {
    if (!this.cacheTour) return;
    let prevDirection = this.cacheTour.start!.direction;
    let nextDirection = prevDirection;

    this.setStationAndCornerVisibilityByDirection(nextDirection);
  }
  onMessageCancel() {
    this.exitPickupTour();
  }
  setLocationMode() {
    this.stationModels.forEach((s) => s.setClickable(true));
    this.cornerModels.forEach((c) => c.setClickable(true));
  }
  exitLocationMode() {
    this.stationModels.forEach((s) => s.setClickable(false));
    this.cornerModels.forEach((c) => c.setClickable(false));
    this.setStationVisible();
    this.setCornerInvisible();
  }
  stationClickHandler(meta: PatrollingType.Station) {
    if (this.picking) {
      this.pickupStation(meta);
    }
  }
  cornerClickHandler(meta: PatrollingType.Corner) {
    if (this.picking) {
      this.cacheTour!.via.push(meta);
      const marker = this.createViaMarker(
        meta.center,
        this.cachePickupMarkers.length,
      );
      const last = this.cachePickupMarkers[this.cachePickupMarkers.length - 1];
      this.cachePickupMarkers.push({
        data: meta,
        svg: marker,
      });
      if (last && last.data.type === 'station') {
        const paths = PatrollingTour.getPathFromStationToCorner(
          last.data as PatrollingType.Station,
          meta,
          this.meta,
        );
        const connections = deconstructConnections(paths);
        this.renderCacheConnections(connections);
      }
      this.setStationAndCornerVisibilityByDirection(
        getOppositeDirection(meta.direction),
      );
      this.setCornerInvisible(); // ！ 不允许连续两次拐点， 隐藏掉头点，只显示站点
      this.queryMessageConfirm(false);
    }
  }
  pickupStation(meta: PatrollingType.Station) {
    if (!this.cacheTour?.start) {
      this.setCacheTourStart(meta);
      return;
    }
    if (this.cacheTour?.start && !this.cacheTour.confirmStart) {
      this.setCacheTourStart(meta);
      return;
    }
    const marker = this.createViaMarker(
      meta.center,
      this.cachePickupMarkers.length,
      '#18C288',
    );
    const last = this.cachePickupMarkers[this.cachePickupMarkers.length - 1];
    this.cachePickupMarkers.push({
      data: meta,
      svg: marker,
    });
    this.cacheTour.via.push(meta);
    if (last && last.data.type === 'station') {
      const paths = PatrollingTour.getPathFromStationToStation(
        last.data as PatrollingType.Station,
        meta,
        this.meta,
      );
      const connections = deconstructConnections(paths);
      this.renderCacheConnections(connections);
    }

    if (last && last.data.type === 'corner') {
      const paths = PatrollingTour.getPathFromCornerToStation(
        last.data as PatrollingType.Corner,
        meta,
        this.meta,
      );
      const connections = deconstructConnections(paths);
      this.renderCacheConnections(connections);
    }

    this.queryMessageConfirm(true);
    this.setStationAndCornerVisibilityByDirection(meta.direction);
  }
  setCacheTourStart(meta: PatrollingType.Station) {
    this.clearCachePickupMarkers();
    this.cacheTour!.start = meta;
    const marker = this.setStartMarkerUponStation(meta);
    this.cachePickupMarkers = [
      {
        data: meta,
        svg: marker,
      },
    ];
    this.queryMessageConfirm(true);
  }

  clearCachePickupMarkers() {
    this.cachePickupMarkers.forEach((c) => c.svg?.remove());
  }
  clearCacheTour() {
    this.clearCachePickupMarkers();
    this.cacheTour = undefined;
    this.clearCacheConnectionGroup();
  }
  setStartMarkerUponStation(meta: PatrollingType.Station) {
    const marker = this.createStartStationMarker(meta.center);
    return marker;
  }
  setEndMarkerUponStation(meta: PatrollingType.Station) {
    const marker = this.createEndStationMarker(meta.center);
    return marker;
  }
  createStartStationMarker(point: PatrollingType.Point) {
    const marker = this.getMarker(point, '#18C288', '始');
    return marker;
  }
  createViaMarker(
    point: PatrollingType.Point,
    index: number,
    color = '#FFDD00',
  ) {
    const marker = this.getMarker(point, color, index + '');
    return marker;
  }
  createEndStationMarker(point: PatrollingType.Point) {
    const marker = this.getMarker(point, '#FFDD00', '终');
    return marker;
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
    const marker = this.markerGroup!.append('g')
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

  renderCacheConnections(connections: PatrollingType.Connection[]) {
    const { lineWidth } = this.meta;
    connections.forEach((c) => {
      this.cacheConnectionGroup!.append('polyline')
        .attr('from', c.from)
        .attr('to', c.to)
        .attr('points', getConnectionPointsString(c))
        .attr('fill', 'none')
        .attr('stroke', '#FFDD00')
        .attr('stroke-width', lineWidth)
        .attr('stroke-linejoin', 'round') // border rounded
        .attr('stroke-linecap', 'round') // border rounded
        .attr('stroke-miterlimit', 10);
    });
  }
  renderCacheTour() {
    const [start, end] = this.cachePickupMarkers;
    if (!start || !end) return;
  }

  // 添加缩放初始化方法
  initializeZoom() {
    if (!this.svg) return;

    this.zoom = d3
      .zoom<SVGSVGElement, unknown>()
      .filter((event) => event.type !== 'dblclick')
      .scaleExtent([this.minZoom, this.maxZoom])
      .on('zoom', (event) => {
        this.currentScale = event.transform.k;
        this.svg!.select('g.rootGroup').attr(
          'transform',
          event.transform.toString(),
        );
        this.updateZoomButtonStates();
      });

    this.svg.call(this.zoom);
    this.svg.call(this.zoom.transform, d3.zoomIdentity);
  }
  // 添加辅助方法来更新按钮状态
  private updateZoomButtonStates() {
    if (!this.svg) return;

    const zoomIn = this.svg.select('.zoom-in');
    const zoomOut = this.svg.select('.zoom-out');

    // 更新放大按钮状态
    zoomIn
      .select('rect')
      .style(
        'fill',
        this.currentScale >= this.maxZoom ? this.disabledFill : this.normalFill,
      )
      .style(
        'cursor',
        this.currentScale >= this.maxZoom ? 'not-allowed' : 'pointer',
      );

    zoomIn
      .select('path')
      .style('stroke-opacity', this.currentScale >= this.maxZoom ? 0.5 : 1);

    // 更新缩小按钮状态
    zoomOut
      .select('rect')
      .style(
        'fill',
        this.currentScale <= this.minZoom ? this.disabledFill : this.normalFill,
      )
      .style(
        'cursor',
        this.currentScale <= this.minZoom ? 'not-allowed' : 'pointer',
      );

    zoomOut
      .select('path')
      .style('stroke-opacity', this.currentScale <= this.minZoom ? 0.5 : 1);
  }

  renderZoomTool() {
    setTimeout(() => {
      const rootRect = this.rootGroup?.node()?.getBBox();
      const re = calculateSvgElementRealSize(
        this.wrapper.width,
        this.wrapper.height,
        this.meta.preset.width,
        this.meta.preset.height,
        rootRect?.width || 0,
        rootRect?.height || 0,
      );
      const absX = -re.realX + 24;
      const absY = 0;
      const toolGroup = this.svg!.append('g').attr(
        'transform',
        `translate(${absX}, ${absY})`,
      );
      this.renderZoomInButton(toolGroup);
      this.renderZoomOutButton(toolGroup);
      this.renderZoomResetButton(toolGroup);
    }, 300);
  }

  private renderZoomInButton(toolGroup: SvgGroup) {
    const zoomIn = toolGroup
      .append('g')
      .attr('class', 'zoom-in')
      .style('cursor', 'pointer')
      .on('click', (ev: Event) => {
        ev.preventDefault();
        if (this.svg && this.zoom && this.currentScale < this.maxZoom) {
          this.svg.transition().duration(300).call(this.zoom.scaleBy, 1.2);
        }
      });

    const zoomInRect = zoomIn
      .append('rect')
      .attr('x', 0)
      .attr('y', 0)
      .attr('width', 24)
      .attr('height', 24)
      .attr('rx', 2)
      .attr(
        'style',
        `fill: ${this.normalFill}; stroke: #FFFFFF; stroke-width: 1px`,
      );

    this.addHoverEffect(zoomInRect, () => this.currentScale < this.maxZoom);

    zoomIn
      .append('path')
      .attr('d', 'M6,11L18,11M12,5L12,17')
      .attr('stroke', '#FFFFFF')
      .attr('stroke-width', '1.5');
  }

  private renderZoomOutButton(toolGroup: SvgGroup) {
    const zoomOut = toolGroup
      .append('g')
      .attr('class', 'zoom-out')
      .attr('transform', 'translate(0, 34)')
      .style('cursor', 'pointer')
      .on('click', (ev: Event) => {
        ev.preventDefault();
        if (this.svg && this.zoom && this.currentScale > this.minZoom) {
          this.svg.transition().duration(300).call(this.zoom.scaleBy, 0.8);
        }
      });

    const zoomOutRect = zoomOut
      .append('rect')
      .attr('x', 0)
      .attr('y', 0)
      .attr('width', 24)
      .attr('height', 24)
      .attr('rx', 2)
      .attr(
        'style',
        `fill: ${this.normalFill}; stroke: #FFFFFF; stroke-width: 1px`,
      );

    this.addHoverEffect(zoomOutRect, () => this.currentScale > this.minZoom);

    zoomOut
      .append('path')
      .attr('d', 'M6,11L18,11')
      .attr('stroke', '#FFFFFF')
      .attr('stroke-width', '1.5');
  }

  private renderZoomResetButton(toolGroup: SvgGroup) {
    const zoomReset = toolGroup
      .append('g')
      .attr('class', 'zoom-reset')
      .attr('transform', 'translate(0, 67)')
      .style('cursor', 'pointer')
      .on('click', () => {
        if (this.svg && this.zoom) {
          this.svg
            .transition()
            .duration(300)
            .call(this.zoom.transform, d3.zoomIdentity);
        }
      });

    const zoomResetRect = zoomReset
      .append('rect')
      .attr('x', 0)
      .attr('y', 0)
      .attr('width', 24)
      .attr('height', 24)
      .attr('rx', 2)
      .attr(
        'style',
        `fill: ${this.normalFill}; stroke: #EEEEEE; stroke-width: 1px`,
      );

    this.addHoverEffect(zoomResetRect, () => true);

    const icon = zoomReset
      .append('path')
      .attr('class', 'zoom-reset-icon')
      .attr(
        'd',
        'M17.65 6.35A7.958 7.958 0 0012 4c-4.42 0-7.99 3.58-7.99 8s3.57 8 7.99 8c3.73 0 6.84-2.55 7.73-6h-2.08A5.99 5.99 0 0112 18c-3.31 0-6-2.69-6-6s2.69-6 6-6c1.66 0 3.14.69 4.22 1.78L13 11h7V4l-2.35 2.35z',
      )
      .attr('fill', '#FFFFFF')
      .attr('transform-origin', '12px 12px')
      .attr('transform', 'scale(0.8) rotate(0)');
  }

  private addHoverEffect(
    element: d3.Selection<SVGRectElement, unknown, null, undefined>,
    condition: () => boolean,
  ) {
    element
      .on('mouseover', () => {
        if (condition()) {
          element.style('fill', this.hoverFill);
        }
      })
      .on('mouseout', () => {
        if (condition()) {
          element.style('fill', this.normalFill);
        }
      });
  }

  destroy() {
    this.tours.forEach((t) => t.destroy());
    this.tours = [];
    this.svg?.remove();
  }

  get width() {
    return this.meta.preset.width;
  }
  get height() {
    return this.meta.preset.height;
  }
}
