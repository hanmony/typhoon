declare namespace PatrollingType {
  interface Point {
    x: number;
    y: number;
  }

  interface BaseConnection {
    points: Point[];
  }

  interface Connection extends BaseConnection {
    from: string;
    to: string;
  }

  interface RawCornerCouple {
    起始站点: string;
    结束站点: string;
    上行: string;
    下行: string;
    支线站点?: string[];
  }
  interface Corner {
    type: string;
    center: Point;
    oppositeCenter: Point;
    centerString: string;
    oppositeCenterString: string;
    from: string;
    to: string;
    direction: 'up' | 'down';
  }

  interface RawStation {
    center: Point;
    name: string;
    direction: 'up' | 'down';
  }

  interface Station {
    type: string;
    nameKey: string;
    center: Point;
    name: string;
    direction: 'up' | 'down';
  }
  interface RawOrder {
    起始站点: string;
    结束站点: string;
    上下行: '上行' | '下行';
    里程数: number;
  }

  interface BaseOrder {
    start: string;
    end: string;
    direction: 'up' | 'down';
    canTurn: boolean;
    distance: number;
  }

  interface LineMetaPreset {
    width: number;
    height: number;
    svgString: string;
    arrowString: string;
  }

  interface Path {
    from: string;
    to: string;
  }

  class TopologyNode {
    name: string;
    to: { target: TopologyNode; distance: number }[];
  }
  interface TopologyDiagram {
    nodes: TopologyNode[];
  }

  interface TopologyPath extends Path {
    direction: 'up' | 'down';
    distance: number;
  }

  interface CombinedTopologyPath extends TopologyPath {
    entire: boolean;
    forward: boolean;
    connections: Connection[];
  }

  export interface Tour {
    start: PatrollingType.Station;
    end: PatrollingType.Station;
    combinedPath: PatrollingType.CombinedTopologyPath[];
    connections: PatrollingType.Connection[];
    totalDistance: number;
  }

  interface LineMeta {
    name: string;
    preset: LineMetaPreset;
    connections: Connection[];
    stations: Station[];
    corners: Corner[];
    lineWidth: number;
    presetCombinedTopologyPath: CombinedTopologyPath[];
    proximityPrinciple?: boolean;
    // orders: BaseOrder[];
  }

  interface TourMeta {
    line: string;
    identifiers: string[];
    startTime: Date;
    speed: number;
  }

  interface TourDto extends TourMeta {
    id: string;
    createTime: Date;
    serialNumber: number;
  }
}
