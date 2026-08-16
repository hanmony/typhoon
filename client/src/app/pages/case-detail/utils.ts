import L from 'leaflet';
import 'proj4leaflet';
import { ActionCategory } from '../../domain/action.category';
import { ActionDto } from '../../domain/action.dto';
import { ILineData } from './meta';
import { TableColumn, typhoonTableMeta } from './raw-typhoon.table.meta';

interface IPoint {
  x: number;
  y: number;
}

interface ILine {
  start: IPoint;
  end: IPoint;
  controlPoints: IPoint[];
}
const getDistance = (p1: IPoint, p2: IPoint) => {
  return Math.sqrt(Math.pow(p1.x + p2.x, 2) + Math.pow(p1.y + p1.y, 2));
};
export const getControlPoints = (points: IPoint[]) => {
  //三个点出两个控制点
  const p01 = getDistance(points[0], points[1]);
  const p12 = getDistance(points[1], points[2]);
  const p02 = p01 + p12;
  let vector = [points[2].x - points[0].x, points[2].y - points[0].y];
  return [
    {
      x: points[1].x - (vector[0] * 0.5 * p01) / p02,
      y: points[1].y - (vector[1] * 0.5 * p01) / p02,
    },
    {
      x: points[1].x + (vector[0] * 0.5 * p01) / p02,
      y: points[1].y + (vector[1] * 0.5 * p01) / p02,
    },
  ];
};
export function getSmoothCurve(points: IPoint[]): ILine[] {
  const lines: ILine[] = [];
  for (let i = 1; i < points.length - 1; i++) {
    let controlPoints: IPoint[] = [];
    // const xc = (points[i].x + points[i + 1].x) / 2;
    // const yc = (points[i].y + points[i + 1].y) / 2;
    controlPoints = controlPoints.concat(
      getControlPoints([points[i - 1], points[i], points[i + 1]]),
    );
    lines.push({
      start: points[i - 1],
      end: points[i],
      controlPoints,
    });
  }
  return lines;
}

const drawStation = (map: L.Map, coord: L.LatLngExpression) => {
  L.circle(coord, {
    color: '#10b981',
    fillColor: '#6ee7b7',
    fillOpacity: 0.5,
    weight: 1,
    stroke: true,
    radius: 100, // 半径多少米
  }).addTo(map);
};

const drawExtensionPoint = (map: L.Map, coord: L.LatLngExpression) => {
  L.circle(coord, {
    color: '#f5d300',
    fillColor: '#f5d300',
    fillOpacity: 0.5,
    weight: 1,
    stroke: true,
    radius: 50, // 半径多少米,
  }).addTo(map);
};
export const drawStationLine = (
  map: L.Map,
  lineData: ILineData[],
  lineOption: L.PolylineOptions = {},
) => {
  lineData.forEach((e) => {
    if (e.type === 'station') {
      drawStation(map, e.coord as L.LatLngExpression);
    } else if (e.type === 'extension') {
      drawExtensionPoint(map, e.coord as L.LatLngExpression);
    }
  });

  L.polyline(lineData.map((e) => e.coord) as L.LatLngExpression[], {
    color: '#f3d',
    weight: 5,
    ...lineOption,
  }).addTo(map);
};

export function getAnimationFrame() {
  let requestAnimationFrame =
    window.requestAnimationFrame ||
    // @ts-ignore
    window.webkitRequestAnimationFrame ||
    // @ts-ignore
    window.mozRequestAnimationFrame ||
    // @ts-ignore
    window.msRequestAnimationFrame;

  if (requestAnimationFrame) {
    return requestAnimationFrame;
  }

  if (!requestAnimationFrame) {
    // @ts-ignore
    requestAnimationFrame = (callback: FrameRequestCallback) => {
      return setTimeout(() => {
        callback(performance.now());
      }, 1000 / 60);
    };
    window.cancelAnimationFrame = clearTimeout;
  }
  return requestAnimationFrame;
}

export interface TyphoonTableData {
  data: ActionDto[];
  key: ActionCategory;
  columns: TableColumn[];
}
export const getTyphoonTableData = (evs: ActionDto[]): TyphoonTableData[] => {
  return typhoonTableMeta.map((table) => {
    return {
      ...table,
      data: evs.filter((ev) => ev.category === table.key),
    };
  });
};
