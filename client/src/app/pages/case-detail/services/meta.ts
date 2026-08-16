import Color from 'color';
import { CaseDto } from '../../../domain/case.dto';
import { PathInfoDto } from '../../../domain/path.info.dto';
import ALL_METRO_LINES_DATA_2026 from './metro.2026.data';
import ALL_METRO_LINES_DATA, { IRawLinePoint, rawDepots } from './metro.data';

export type MakerDirection = 'left' | 'right' | 'up' | 'down';
export interface ILinePoint {
  coord: number[];
  type: 'station' | 'extension' | 'depot';
  name?: string;
  makerDirection: MakerDirection;
}

export const makerDirectionMap: Record<string, MakerDirection> = {
  左: 'left',
  右: 'right',
  上: 'up',
  下: 'down',
};

export interface ILineData {
  name: string;
  color: string;
  colorDto: Color;
  points: ILinePoint[];
  branches: Map<string, ILinePoint[]>;
}

function formatTimeString(d: Date) {
  if (!d) return '';
  d = new Date(d);
  return `${d.getFullYear()}-${(d.getMonth() + 1)
    .toString()
    .padStart(2, '0')}-${d.getDate().toString().padStart(2, '0')} ${d
    .getHours()
    .toString()
    .padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`;
}

// const offset = [0.00235, -0.0042];
const offset = [0.00185, -0.0045];
// const offset = [0, 0];
export function formatRowPoint(rowLineData: IRawLinePoint): ILinePoint {
  const { 坐标, 类型, 站名, 事件朝向 } = rowLineData;
  const coord = 坐标.split(',').map((e, i) => parseFloat(e) + offset[i]);
  return {
    coord,
    type:
      类型 === '站点' || 类型 === '车站' || 类型.indexOf('站点') !== -1
        ? 'station'
        : 'extension',
    name: 站名,
    makerDirection: makerDirectionMap[事件朝向 || ''] || 'left',
  };
}

const lineMap = new Map([
  ['1号线', '#e3002b'],
  ['2号线', '#8cc220'],
  ['3号线', '#fcd600'],
  ['4号线', '#461d84'],
  ['5号线', '#944d9a'],
  ['6号线', '#d40068'],
  ['7号线', '#ed6f00'],
  ['8号线', '#0094d8'],
  ['9号线', '#87caed'],
  ['10号线', '#c6afd4'],
  ['11号线', '#871c2b'],
  ['12号线', '#007a60'],
  ['13号线', '#e999c0'],
  ['14号线', '#616020'],
  ['15号线', '#b6a27a'],
  ['16号线', '#98d1c0'],
  ['17号线', '#bc796f'],
  ['18号线', '#c4984e'],
  ['浦江线', '#b5b5b6'],
  ['磁浮线', '#cf5617'],
]);

export const lineColorMap2026 = new Map(
  Array.from(lineMap).map(([name, color]) => {
    return [name, color];
  }),
);
lineColorMap2026.set('机场联络线', '#33688A'); // 市域线

export const lineNames = Array.from(lineColorMap2026.keys());

const lineMarkPrefix = '/assets/images/dispatch-center/line-mark/';
const lineMarkSuffix = '.png';
const lineMarkMap: Record<string, string> = {
  '1号线': '1',
  '2号线': '2',
  '3号线': '3',
  '4号线': '4',
  '5号线': '5',
  '6号线': '6',
  '7号线': '7',
  '8号线': '8',
  '9号线': '9',
  '10号线': '10',
  '11号线': '11',
  '12号线': '12',
  '13号线': '13',
  '14号线': '14',
  '15号线': '15',
  '16号线': '16',
  '17号线': '17',
  '18号线': '18',
  '19号线': '19',
  '20号线': '20',
  '21号线': '21',
  '22号线': '22',
  '23号线': '23',
  浦江线: 'pujiang',
  磁浮线: 'maglev',
  机场联络线: 'airport',
};

export function getLineMark(line: string) {
  return lineMarkPrefix + lineMarkMap[line] + lineMarkSuffix;
}

const lineArrowMarkPrefix = '/assets/images/supervisor/line-arrow-mark/';
const lineArrowMarkSuffix = '.png';
export function getLineArrowMark(line: string) {
  return lineArrowMarkPrefix + lineMarkMap[line] + lineArrowMarkSuffix;
}

// const emptyLineData: ILineData = {

// }
export function getLineData(
  lineMap: Map<string, string>,
  lineRawData: Record<string, IRawLinePoint[]>,
): ILineData[] {
  return Array.from(lineMap).map(([name, color]) => {
    const data = lineRawData[name];
    const result = {
      name,
      color,
      colorDto: Color(color),
      points: [],
      branches: new Map(),
    } as ILineData;
    if (!data) {
      return result;
    }
    const fork = data.findIndex((p) => p.类型 === '支线站点');
    if (fork === -1) {
      // 没有支线
      result.points = data.map(formatRowPoint);
      return result;
    } else {
      // 有支线
      const branchRegExp = /支线\d+/;
      const branches = new Map();
      data.forEach((p) => {
        const match = p.类型.match(branchRegExp);
        if (match?.length) {
          const branchName = match[0];
          const points = branches.get(branchName) || [];
          points.push(formatRowPoint(p));
          branches.set(branchName, points);
        } else {
          result.points.push(formatRowPoint(p));
        }
      });
      result.branches = branches;
    }

    return result;
  });
}
export const linesData: ILineData[] = getLineData(
  lineMap,
  ALL_METRO_LINES_DATA,
);
export const linesData2026: ILineData[] = getLineData(
  lineColorMap2026,
  ALL_METRO_LINES_DATA_2026,
);

export interface ITyphoonRawState {
  时间: string;
  中心位置: string;
  风速风力?: string;
  中心气压?: string;
  风圈半径?: string;
  登陆信息?: string;
}
export type TyphoonRawData = ITyphoonRawState[];

export interface ITyphoonRadius {
  ne: number;
  se: number;
  sw: number;
  nw: number;
}
export interface ITyphoonState {
  center: [number, number];
  lon: number;
  lat: number;
  time: Date;
  timeString: string;
  formattedTimeString: string;
  durationFromLastState: number;
  speed: number;
  level: number;
  centerPressure: number;
  radius: ITyphoonRadius[];
  radiusText: string;
  power?: string;
  strong?: string;
  tendency?: string;
  direction?: string;
  info?: string;
}

const getPower = (speedGrateStr: string) => {
  // 20米/秒,8级
  const regex = /(\d+)米\/?秒,\s*(\d+)级/;
  const match = speedGrateStr.match(regex);
  if (!match) {
    throw new Error('风速风力格式不正确: ' + speedGrateStr);
  }
  return {
    speed: parseFloat(match[1]),
    level: parseFloat(match[2]),
  };
};

const formatCenterPressure = (str?: string) => {
  return parseFloat(str || '0');
};

const getEmptyRadius = () => ({ ne: 0, se: 0, sw: 0, nw: 0 });
/**
 * ! formatRadius 这个方法必须保证返回 3 个 ITyphoonRadius 的数组
 * @param str
 * @returns [ITyphoonRadius, ITyphoonRadius, ITyphoonRadius]
 */
function formatRadius(str: string): ITyphoonRadius[] {
  const regex = /东北(\d+) 东南(\d+) 西南(\d+) 西北(\d+)/g;
  const result: any[] = [];
  let match;
  while ((match = regex.exec(str)) != null) {
    const obj = {
      ne: parseInt(match[1]),
      se: parseInt(match[2]),
      sw: parseInt(match[3]),
      nw: parseInt(match[4]),
    };
    result.push(obj);
  }
  if (result.length < 3) {
    result.push(...Array(3 - result.length).fill(getEmptyRadius()));
  }
  return result;
}

const getDurationFromLastState = (s: Date, l?: ITyphoonState) => {
  if (!l) return 0;
  const d = s.getTime() - l.time.getTime();
  return d / 1000 / 60;
};

const typhoonStateFormatter = (
  year: number,
  pathInfo: PathInfoDto,
  combinedLastState?: ITyphoonState,
): ITyphoonState => {
  const {
    time: timeStr,
    latitude,
    longitude,
    power: speedGrateStr,
    pressure: centerPressureStr,
    radius: radiusStr,
    landing: info,
  } = pathInfo;
  // const { speed, level } = getPower(speedGrateStr);
  let speed = combinedLastState?.speed || 0;
  let level = combinedLastState?.level || 0;
  if (speedGrateStr) {
    const sg = getPower(speedGrateStr);
    speed = sg.speed;
    level = sg.level;
  }
  const time = new Date(timeStr);
  const center = [latitude, longitude] as [number, number];
  return {
    time,
    timeString: `${
      time.getMonth() + 1
    }/${time.getDate()} ${time.getHours()}:${time.getMinutes()}`,
    formattedTimeString: formatTimeString(time),
    durationFromLastState: getDurationFromLastState(time, combinedLastState),
    center,
    lon: center[1],
    lat: center[0],
    speed,
    level,
    centerPressure: formatCenterPressure(centerPressureStr),
    radiusText: radiusStr || '',
    radius: radiusStr
      ? formatRadius(radiusStr)
      : combinedLastState?.radius || [],
    info,
  };
};

export interface ITyphoonData {
  name: string;
  year: number;
  states: ITyphoonState[];
}

export const transferPathInfosToTyphoonMeta = (
  pathInfos: PathInfoDto[],
  caseDetail: CaseDto,
): ITyphoonData => {
  const year = Number(caseDetail.values['台风年度']) || 2022;
  const result: ITyphoonState[] = [];
  let combinedLastState: ITyphoonState;
  pathInfos.forEach((s, i) => {
    const currentFormatted = typhoonStateFormatter(year, s, combinedLastState);
    result.push(currentFormatted);
    combinedLastState = currentFormatted;
  });
  return {
    name: caseDetail.name,
    year: year,
    states: result,
  };
};

export const depots = rawDepots.map((d) => {
  const [lat, lon] = d.坐标.split(',').map((s) => parseFloat(s));
  return {
    name: d.基地名称,
    coord: [lat, lon] as [number, number],
    lat: lat,
    lon: lon,
    line: d.线路,
  };
});
