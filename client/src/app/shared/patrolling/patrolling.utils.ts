import { PatrollingLine } from './patrolling.line.class';
import PatrollingTour from './patrolling.tour.class';

export const transferOrder = (
  raw: PatrollingType.RawOrder,
): PatrollingType.BaseOrder => {
  return {
    start: raw.起始站点,
    end: raw.结束站点,
    direction: raw.上下行 === '上行' ? 'up' : 'down',
    canTurn: raw['是否可掉头（0不可，1可以）'] === 1,
    distance: raw.里程数,
  };
};

export const transferOrders = (
  raw: PatrollingType.RawOrder[],
): PatrollingType.BaseOrder[] => {
  return raw.map(transferOrder);
};

export const transferCorners = (
  raw: PatrollingType.RawCornerCouple[],
): PatrollingType.Corner[] => {
  const corners: PatrollingType.Corner[] = [];
  raw.forEach((r) => {
    const upPoint = {
      x: parseFloat(r.上行.split(',')[0]),
      y: parseFloat(r.上行.split(',')[1]),
    };
    const downPoint = {
      x: parseFloat(r.下行.split(',')[0]),
      y: parseFloat(r.下行.split(',')[1]),
    };
    corners.push({
      type: 'corner',
      centerString: r.上行,
      center: upPoint,
      oppositeCenter: downPoint,
      oppositeCenterString: r.下行,
      direction: 'up',
      from: r.结束站点,
      to: r.起始站点,
    });
    corners.push({
      type: 'corner',
      centerString: r.下行,
      center: downPoint,
      oppositeCenter: upPoint,
      oppositeCenterString: r.上行,
      direction: 'down',
      from: r.起始站点,
      to: r.结束站点,
    });
  });
  return corners;
};

export const isSamePosition = (
  p1: PatrollingType.Point,
  p2: PatrollingType.Point,
) => p1.x === p2.x && p1.y === p2.y;

/**
 * 根据站点数据为每条线路添加方向和始末站点信息
 * @param base 基础线路数据
 * @param stations 站点数据
 * @returns 包含方向和始末站点信息的线路数据
 */
export const mixinConnectionProperties = (
  base: PatrollingType.BaseConnection[],
  stations: PatrollingType.Station[],
): PatrollingType.Connection[] => {
  return base.map((connection) => {
    const firstPoint = connection.points[0];
    const lastPoint = connection.points[connection.points.length - 1];
    const startStation = stations.find((s) =>
      isSamePosition(firstPoint, s.center),
    );
    const endStation = stations.find((s) =>
      isSamePosition(lastPoint, s.center),
    );
    const direction = startStation?.direction || endStation?.direction || 'up';
    const start = direction === 'up' ? startStation?.name : endStation?.name;
    const end = direction === 'up' ? endStation?.name : startStation?.name;
    let from = start ? `${start}:${direction}` : '';
    let to = end ? `${end}:${direction}` : '';
    return {
      ...connection,
      from,
      to,
    };
  });
};

export const mixinCorrectConnectionOnPath = (
  paths: PatrollingType.TopologyPath[],
  allConnections: PatrollingType.Connection[],
): PatrollingType.CombinedTopologyPath[] => {
  const base = paths.map((p) => {
    let connections: PatrollingType.Connection[] = [];
    const targetUnit = allConnections.find(
      (c) => c.from === p.from && c.to === p.to,
    );
    if (targetUnit) {
      connections.push(targetUnit);
    } else {
      const emptyFrom = allConnections.find((c) => !c.from && c.to === p.to);
      const emptyTo = allConnections.find((c) => c.from === p.from && !c.to);
      if (emptyFrom && emptyTo) {
        if (p.direction === 'down') {
          connections = [emptyFrom, emptyTo];
        } else {
          connections = [emptyTo, emptyFrom];
        }
      }
    }
    return {
      ...p,
      entire: true,
      forward: true,
      connections,
    };
  });
  const baseUp = base.filter((p) => p.direction === 'up');
  let baseDown = base.filter((p) => p.direction === 'down');
  baseDown = baseDown.map((p) => {
    return {
      ...p,
      connections: Reverse.getReverseConnections(p.connections),
      entire: true,
      forward: true,
    };
  });
  const reverseUp = baseUp.map((p) => Reverse.getReversedPath(p)); //  forward = false
  const reverseDown = baseDown.map((p) => Reverse.getReversedPath(p)); // forward = false
  return [...baseUp, ...reverseUp, ...baseDown, ...reverseDown];
};

export const findNeighborStationConnections = (
  startStationName: string,
  endStationName: string,
  connections: PatrollingType.Connection[],
) => {
  const target = connections.find(
    (c) => c.from === startStationName && c.to === endStationName,
  );
  if (target) return [target];
  // 相邻但是被截断
  const start = connections.find((c) => c.from === startStationName && !c.to);
  const end = connections.find((c) => c.to === endStationName && !c.from);
  if (start && end) return [start, end];
  return [];
};

// export const isSameDirection = (
//   startStation: PatrollingType.Station,
//   endStation: PatrollingType.Station,
// ) => startStation.direction === endStation.direction;

export const getOppositeDirection = (direction: 'up' | 'down') => {
  return direction === 'up' ? 'down' : 'up';
};

export const getStationKey = (station: PatrollingType.Station) =>
  `${station.name}:${station.direction}`;

export const getCornerKey = (corner: PatrollingType.Corner) => ({
  fromNameKey: corner.from ? `${corner.from}:${corner.direction}` : '',
  toNameKey: corner.to ? `${corner.to}:${corner.direction}` : '',
});

export const convertOrderToPath = (
  orders: PatrollingType.BaseOrder[],
): PatrollingType.TopologyPath[] => {
  const convertPath: PatrollingType.TopologyPath[] = [];
  orders.forEach((o) => {
    const from = o.start ? `${o.start}:${o.direction}` : '';
    const to = o.end ? `${o.end}:${o.direction}` : '';
    convertPath.push({
      from,
      to,
      distance: o.distance,
      direction: o.direction,
    });
  });
  return convertPath;
};

export const generalTopologyDiagram = (
  stations: PatrollingType.Station[],
  presetPath: PatrollingType.CombinedTopologyPath[],
) => {
  const diagram: PatrollingType.TopologyDiagram = { nodes: [] };
  diagram.nodes = stations.map((s) => ({
    name: getStationKey(s),
    to: [],
  }));

  for (const p of presetPath) {
    const fromNode = diagram.nodes.find((n) => n.name === p.from);
    const toNode = diagram.nodes.find((n) => n.name === p.to);
    if (!fromNode || !toNode) continue;
    fromNode.to.push({
      target: toNode,
      distance: p.distance,
    });
  }

  return diagram;
};

export const deconstructStationKey = (stationKey: string) => {
  const [name, direction] = stationKey.split(':');
  return { name, direction };
};

export const deconstructConnections = (
  cps: PatrollingType.CombinedTopologyPath[],
): PatrollingType.Connection[] => {
  return cps.flatMap((c) => c.connections);
};

export const getStationPath = (
  from: PatrollingType.Station,
  to: PatrollingType.Station,
  presetPath: PatrollingType.CombinedTopologyPath[],
  proximityPrinciple = false, // 就近原则
): PatrollingType.CombinedTopologyPath[] => {
  const empty: PatrollingType.CombinedTopologyPath[] = [];
  const sameDirectionPreset = presetPath.filter(
    (p) => p.direction === from.direction,
  );
  const fromKey = from.nameKey;
  const toKey = to.nameKey;
  const neighbor = sameDirectionPreset.find(
    (p) => p.from === fromKey && p.to === toKey,
  );
  if (neighbor) {
    return [neighbor];
  }

  const forwardSameDirectionPreset = sameDirectionPreset.filter(
    (p) => p.forward,
  );
  const backwardSameDirectionPreset = sameDirectionPreset.filter(
    (p) => !p.forward,
  );
  function getPathRecursion(
    fromKey: string,
    toKey: string,
    sameDirectionSequence: PatrollingType.CombinedTopologyPath[],
  ) {
    let currentPath = sameDirectionSequence.find((f) => f.from === fromKey);
    let currentToKey = currentPath?.to;
    let result: PatrollingType.CombinedTopologyPath[] = [];
    let count = 0;
    while (count < sameDirectionSequence.length - 1) {
      if (currentPath && currentToKey) {
        if (currentToKey === toKey) {
          result.push(currentPath);
          return result;
        } else {
          result.push(currentPath);
        }

        const nextPath = sameDirectionSequence.find(
          (p) => p.from === currentPath!.to,
        );
        currentPath = nextPath;
        currentToKey = currentPath?.to;
      } else {
        break;
      }
      count++;
    }
    return null;
  }
  const forwardPath = getPathRecursion(
    fromKey,
    toKey,
    forwardSameDirectionPreset,
  );
  if (forwardPath && !proximityPrinciple) {
    return forwardPath;
  }
  const backwardPath = getPathRecursion(
    fromKey,
    toKey,
    backwardSameDirectionPreset,
  );
  if (proximityPrinciple && forwardPath && backwardPath) {
    return forwardPath.length < backwardPath.length
      ? forwardPath
      : backwardPath;
  } else {
    if (forwardPath) {
      return forwardPath;
    }
    if (backwardPath) {
      return backwardPath;
    }
    return empty;
  }
};

export function isPointOnPath(
  point: PatrollingType.Point,
  polyline: PatrollingType.Point[],
): boolean {
  if (polyline.length < 2) return false;

  const epsilon = 1e-8; // 可根据需要调整误差范围

  for (let i = 0; i < polyline.length - 1; i++) {
    const p1 = polyline[i];
    const p2 = polyline[i + 1];

    const dx = p2.x - p1.x;
    const dy = p2.y - p1.y;
    const l2 = dx * dx + dy * dy;

    // 处理线段退化为点的情况
    if (l2 === 0) {
      if (Math.hypot(point.x - p1.x, point.y - p1.y) < epsilon) return true;
      continue;
    }

    // 计算投影参数t
    const t = ((point.x - p1.x) * dx + (point.y - p1.y) * dy) / l2;
    const tClamped = Math.max(0, Math.min(1, t)); // 将t限制在[0,1]区间

    // 计算投影点坐标
    const projX = p1.x + tClamped * dx;
    const projY = p1.y + tClamped * dy;

    // 计算点与投影点的距离平方
    const distSq = (point.x - projX) ** 2 + (point.y - projY) ** 2;

    // 判断距离是否在允许误差内
    if (distSq < epsilon * epsilon) return true;
  }

  return false;
}
export const Reverse = {
  getReversePoints(points: PatrollingType.Point[]) {
    return points.slice().reverse();
  },

  getReverseConnection(connection: PatrollingType.Connection) {
    return {
      from: connection.to,
      to: connection.from,
      points: this.getReversePoints(connection.points),
    };
  },

  getReverseConnections(connections: PatrollingType.Connection[]) {
    return connections
      .map((connection) => this.getReverseConnection(connection))
      .slice()
      .reverse();
  },
  getReversedPath(path: PatrollingType.CombinedTopologyPath) {
    return {
      ...path,
      from: path.to,
      to: path.from,
      forward: !path.forward,
      connections: this.getReverseConnections(path.connections),
    };
  },
  getReverseCorner(
    corner: PatrollingType.Corner,
    corners: PatrollingType.Corner[],
  ) {
    const oppositeCorner = corners.find(
      (c) => c.centerString === corner.oppositeCenterString,
    );
    return oppositeCorner!;
  },
};
export function getPartialPathFromEdge(
  matchedPath: PatrollingType.CombinedTopologyPath,
  center: PatrollingType.Point,
): PatrollingType.CombinedTopologyPath {
  const cs = matchedPath.connections;
  if (!cs.length) return matchedPath;
  const firsCs = cs[0];
  const lastCs = cs[cs.length - 1];
  const firstCut = {
    ...firsCs,
    points: getPartialPolyline(firsCs.points, center),
  };
  if (cs.length === 1) {
    return {
      ...matchedPath,
      entire: false,
      distance: matchedPath.distance ? 1 : 0,
      connections: [firstCut],
    };
  } else if (cs.length === 2) {
    const firsCsPs = firsCs.points;
    const lastCsPs = lastCs.points;
    const isFirsCsOnPath = isPointOnPath(center, firsCsPs);
    const isLastCsOnPath = isPointOnPath(center, lastCsPs);
    if (isFirsCsOnPath) {
      return {
        ...matchedPath,
        entire: false,
        distance: matchedPath.distance ? 1 : 0,
        connections: [firstCut],
      };
    } else if (isLastCsOnPath) {
      const lastCut = {
        ...lastCs,
        points: getPartialPolyline(lastCs.points, center),
      };

      return {
        ...matchedPath,
        entire: false,
        distance: matchedPath.distance ? 1 : 0,
        connections: [firsCs, lastCut],
      };
    }
  }
  return matchedPath;
}
export function getPartialPathFromInner(
  matchedPath: PatrollingType.CombinedTopologyPath,
  center: PatrollingType.Point,
): PatrollingType.CombinedTopologyPath {
  const cs = matchedPath.connections;
  if (!cs.length) return matchedPath;
  const firsCs = cs[0];
  const firsCsPs = firsCs.points;
  const lastCs = cs[cs.length - 1];
  if (cs.length === 1) {
    return {
      ...matchedPath,
      entire: false,
      distance: matchedPath.distance ? 1 : 0,
      // distance:
      connections: [
        {
          ...firsCs,
          points: getPartialPolyline(firsCsPs.slice().reverse(), center)
            .slice()
            .reverse(),
        },
      ],
    };
  } else if (cs.length === 2) {
    const lastCsPs = lastCs.points;
    const isFirsCsOnPath = isPointOnPath(center, firsCsPs);
    const isLastCsOnPath = isPointOnPath(center, lastCsPs);
    if (isFirsCsOnPath) {
      return {
        ...matchedPath,
        entire: false,
        distance: matchedPath.distance ? 1 : 0,
        connections: [
          {
            ...firsCs,
            points: getPartialPolyline(firsCsPs.slice().reverse(), center)
              .slice()
              .reverse(),
          },
          lastCs,
        ],
      };
    } else if (isLastCsOnPath) {
      return {
        ...matchedPath,
        entire: false,
        distance: matchedPath.distance ? 1 : 0,
        connections: [
          {
            ...lastCs,
            points: getPartialPolyline(lastCsPs.slice().reverse(), center)
              .slice()
              .reverse(),
          },
        ],
      };
    }
  }

  return matchedPath;
}
function getPartialPolyline(
  polyline: PatrollingType.Point[],
  cross: PatrollingType.Point,
): PatrollingType.Point[] {
  // 辅助函数：浮点比较
  const equals = (
    a: PatrollingType.Point,
    b: PatrollingType.Point,
    epsilon = 1e-6,
  ) => Math.abs(a.x - b.x) < epsilon && Math.abs(a.y - b.y) < epsilon;

  // 检查 cross 是否是折线顶点
  const vertexIndex = polyline.findIndex((p) => equals(p, cross));
  if (vertexIndex !== -1) {
    return polyline.slice(0, vertexIndex + 1);
  }

  // 遍历线段，检查 cross 是否在线段中间
  for (let i = 0; i < polyline.length - 1; i++) {
    const p0 = polyline[i];
    const p1 = polyline[i + 1];

    // 判断点是否在线段上
    const isOnSegment = (
      p0: PatrollingType.Point,
      p1: PatrollingType.Point,
      c: PatrollingType.Point,
    ) => {
      // 包围盒快速排除
      if (
        c.x < Math.min(p0.x, p1.x) - 1e-6 ||
        c.x > Math.max(p0.x, p1.x) + 1e-6 ||
        c.y < Math.min(p0.y, p1.y) - 1e-6 ||
        c.y > Math.max(p0.y, p1.y) + 1e-6
      ) {
        return false;
      }

      // 向量共线性检查（叉积接近0）
      const crossProduct =
        (c.x - p0.x) * (p1.y - p0.y) - (c.y - p0.y) * (p1.x - p0.x);
      if (Math.abs(crossProduct) > 1e-6) return false;

      // 参数化检查（t ∈ [0,1]）
      const dx = p1.x - p0.x;
      const dy = p1.y - p0.y;
      let t = 0;
      if (Math.abs(dx) > 1e-6) {
        t = (c.x - p0.x) / dx;
      } else if (Math.abs(dy) > 1e-6) {
        t = (c.y - p0.y) / dy;
      } else {
        return equals(p0, c); // 线段退化成点
      }
      return t >= -1e-6 && t <= 1 + 1e-6;
    };

    if (isOnSegment(p0, p1, cross)) {
      // 插入 cross 点并截断
      const newPath = [...polyline.slice(0, i + 1), cross];
      return newPath;
    }
  }

  // 根据题意，cross 一定在折线上，此处仅为兜底
  return polyline;
}

export const isSameDirection = (
  p1: PatrollingType.Point,
  p2: PatrollingType.Point,
  connection: PatrollingType.Connection,
): boolean => {
  const isPointToRight = p1.x - p2.x > 0;
  const isConnectionToRight =
    connection.points[0].x - connection.points[connection.points.length - 1].x >
    0;
  if (isPointToRight && isConnectionToRight) return true;
  if (!isPointToRight && !isConnectionToRight) return true;
  return false;
};
export const shouldPartialInsertBefore = (
  direction: 'up' | 'down',
  reverse: boolean,
) => {
  if (direction === 'up' && reverse) {
    return true;
  }
  if (direction === 'down' && !reverse) {
    return true;
  }
  return false;
};

export const identifierIsStation = (is: string) => {
  const [key] = is.split(':');
  return key === 'station';
};

export const identifierIsCorner = (is: string) => {
  const [key] = is.split(':');
  return key === 'corner';
};

export const findStationMetaByIdentifier = (
  is: string,
  stations: PatrollingType.Station[],
) => {
  const [_, name, direction] = is.split(':');
  return stations.find((s) => s.name === name && s.direction === direction);
};

export const findCornerMetaByIdentifier = (
  is: string,
  corners: PatrollingType.Corner[],
) => {
  const [_, centerString] = is.split(':');
  return corners.find((c) => c.centerString === centerString);
};

export const findMetaByIdentifier = (
  is: string,
  stations: PatrollingType.Station[],
  corners: PatrollingType.Corner[],
) => {
  if (identifierIsStation(is)) {
    return findStationMetaByIdentifier(is, stations);
  }
  if (identifierIsCorner(is)) {
    return findCornerMetaByIdentifier(is, corners);
  }
  return;
};

export const getStationIdentifierString = (s: PatrollingType.Station) => {
  return `station:${s.nameKey}`;
};

export const getCornerIdentifierString = (c: PatrollingType.Corner) => {
  return `corner:${c.centerString}:${c.direction}:${c.from}:${c.to}`;
};

export const getIdentifierString = (
  dto: PatrollingType.Station | PatrollingType.Corner,
): string => {
  if ((dto as PatrollingType.Corner).centerString) {
    return getCornerIdentifierString(dto as PatrollingType.Corner);
  }
  return getStationIdentifierString(dto as PatrollingType.Station);
};

export function getPathPositionLength(
  polyline: PatrollingType.Point[],
): number {
  if (polyline.length < 2) return 0;
  let totalLength = 0;
  for (let i = 0; i < polyline.length - 1; i++) {
    const current = polyline[i];
    const next = polyline[i + 1];
    const dx = next.x - current.x;
    const dy = next.y - current.y;
    totalLength += Math.sqrt(dx ** 2 + dy ** 2);
  }
  return totalLength;
}

export function recalculateDistance(
  target: PatrollingType.CombinedTopologyPath,
  preset: PatrollingType.CombinedTopologyPath[],
) {
  if (target.distance === 0) return target;
  if (target.entire === true) return target;
  const parent = preset.find(
    (p) => p.from === target.from && p.to === target.to,
  );
  if (parent) {
    const entireDistance = parent.distance;
    const entirePositionLength = parent.connections.reduce(
      (acc, c) => acc + getPathPositionLength(c.points),
      0,
    );
    const partialPositionLength = target.connections.reduce(
      (acc, c) => acc + getPathPositionLength(c.points),
      0,
    );
    const partialDistance =
      (entireDistance * partialPositionLength) / entirePositionLength;
    return {
      ...target,
      distance: partialDistance,
    };
  }
  return target;
}
export function getPointsString(data: PatrollingType.Point[]) {
  const pointString = data.map((p) => `${p.x},${p.y}`).join(' ');
  return pointString;
}
export function getConnectionPointsString(data: PatrollingType.Connection) {
  const points = data.points;
  return getPointsString(points);
}

export function separateConnections(
  polylines: PatrollingType.Point[][],
  percentage: number,
): PatrollingType.Point[][][] {
  // 处理边界情况
  if (percentage <= 0) {
    const empty = polylines.map(() => []);
    return [empty, polylines];
  }
  if (percentage >= 100) {
    const empty = polylines.map(() => []);
    return [polylines, empty];
  }

  // 计算总长度和各折线长度
  let totalLength = 0;
  const polylineLengths: number[] = [];
  for (const polyline of polylines) {
    let len = 0;
    for (let i = 1; i < polyline.length; i++) {
      const p1 = polyline[i - 1];
      const p2 = polyline[i];
      len += Math.sqrt((p2.x - p1.x) ** 2 + (p2.y - p1.y) ** 2);
    }
    polylineLengths.push(len);
    totalLength += len;
  }

  const targetLength = (totalLength * percentage) / 100;

  // 寻找需要分割的折线索引
  let accumulated = 0;
  let splitIndex = -1;
  let remainingLength = 0;

  for (let i = 0; i < polylines.length; i++) {
    const len = polylineLengths[i];
    if (accumulated + len >= targetLength) {
      splitIndex = i;
      remainingLength = targetLength - accumulated;
      break;
    }
    accumulated += len;
  }

  // 处理找不到分割点的情况
  if (splitIndex === -1) {
    const empty = polylines.map(() => []);
    return [polylines, empty];
  }

  // 处理无需分割的情况（刚好在折线边界）
  if (Math.abs(remainingLength - polylineLengths[splitIndex]) < 1e-6) {
    const first = polylines.slice(0, splitIndex + 1);
    const second = polylines.slice(splitIndex + 1);
    return [
      [...first, ...polylines.slice(splitIndex + 1).map(() => [])],
      [...polylines.slice(0, splitIndex + 1).map(() => []), ...second],
    ];
  }

  // 在目标折线中寻找分割点
  const polyline = polylines[splitIndex];
  let currentLen = 0;
  let splitSegmentIndex = 0;
  let splitPoint: PatrollingType.Point | null = null;

  for (let i = 1; i < polyline.length; i++) {
    const p1 = polyline[i - 1];
    const p2 = polyline[i];
    const dx = p2.x - p1.x;
    const dy = p2.y - p1.y;
    const segmentLen = Math.sqrt(dx ** 2 + dy ** 2);

    if (currentLen + segmentLen >= remainingLength) {
      splitSegmentIndex = i - 1;
      const ratio = (remainingLength - currentLen) / segmentLen;
      splitPoint = {
        x: p1.x + dx * ratio,
        y: p1.y + dy * ratio,
      };
      break;
    }
    currentLen += segmentLen;
  }

  // 构建分割后的折线
  const newFirstPart = [
    ...polyline.slice(0, splitSegmentIndex + 1),
    splitPoint!,
  ];
  const newSecondPart = [splitPoint!, ...polyline.slice(splitSegmentIndex + 1)];

  // 构建最终结果数组
  const firstResult: PatrollingType.Point[][] = [];
  const secondResult: PatrollingType.Point[][] = [];

  for (let i = 0; i < polylines.length; i++) {
    if (i < splitIndex) {
      firstResult.push([...polylines[i]]);
      secondResult.push([]);
    } else if (i === splitIndex) {
      firstResult.push(newFirstPart);
      secondResult.push(newSecondPart);
    } else {
      firstResult.push([]);
      secondResult.push([...polylines[i]]);
    }
  }

  return [firstResult, secondResult];
}

export function getPositionPoint(
  polylines: PatrollingType.Point[][],
  percentage: number,
): PatrollingType.Point {
  // 收集所有有效线段（长度>0）
  const segments: Array<{
    start: PatrollingType.Point;
    end: PatrollingType.Point;
    length: number;
  }> = [];
  for (const polyline of polylines) {
    for (let i = 0; i < polyline.length - 1; i++) {
      const start = polyline[i];
      const end = polyline[i + 1];
      const dx = end.x - start.x;
      const dy = end.y - start.y;
      const length = Math.hypot(dx, dy);
      if (length > 0) {
        segments.push({ start, end, length });
      }
    }
  }

  // 计算总长度
  const totalLength = segments.reduce((sum, seg) => sum + seg.length, 0);

  // 处理总长度为0的特殊情况
  if (totalLength === 0) {
    // 返回第一个存在的点或默认点
    const firstPoint = polylines[0]?.[0] || { x: 0, y: 0 };
    return { x: firstPoint.x, y: firstPoint.y };
  }

  // 计算目标距离
  const targetDistance = totalLength * (percentage / 100);

  let accumulated = 0;
  for (const seg of segments) {
    if (accumulated + seg.length >= targetDistance) {
      // 计算在当前线段上的位置
      const remaining = targetDistance - accumulated;
      const ratio = remaining / seg.length;
      return {
        x: seg.start.x + (seg.end.x - seg.start.x) * ratio,
        y: seg.start.y + (seg.end.y - seg.start.y) * ratio,
      };
    }
    accumulated += seg.length;
  }

  // 处理边界情况（当percentage >= 100%时返回最后一个点）
  const lastSegment = segments[segments.length - 1];
  return { x: lastSegment.end.x, y: lastSegment.end.y };
}

export function diffTours(
  current: PatrollingType.TourDto[],
  previous: PatrollingType.TourDto[],
): { added: PatrollingType.TourDto[]; removed: PatrollingType.TourDto[] } {
  // 将数组转为 Map 以便快速查找（使用 id 作为键）
  const prevMap = new Map<string, PatrollingType.TourDto>(
    previous.map((t) => [t.id, t]),
  );

  const currentMap = new Map<string, PatrollingType.TourDto>(
    current.map((t) => [t.id, t]),
  );

  // 1. 找出新增事件（存在于 current 但不存在于 previous）
  const added = current.filter((t) => !prevMap.has(t.id));

  // 2. 找出删除事件（存在于 previous 但不存在于 current）
  const removed = previous.filter((t) => !currentMap.has(t.id));

  return { added, removed };
}

export function validateTours(
  tours: PatrollingType.TourDto[],
  model: PatrollingLine,
) {
  if (!model) return false;
  const tourInstances = tours.map(
    (t) =>
      new PatrollingTour({
        tourGroup: model.tourGroup,
        isTemporary: false,
        meta: {
          line: t.line,
          identifiers: t.identifiers,
          startTime: new Date(t.startTime),
          speed: t.speed,
          id: t.id,
          serialNumber: t.serialNumber,
          createTime: new Date(t.createTime),
        },
        lineMeta: model.meta,
      }),
  );
  const hasValidTour = tourInstances.some((t) => {
    const trainState = t.getTrainState();
    return trainState !== 'finished';
  });
  return hasValidTour;
}

// export function getPolylinesLength(polylines:  PatrollingType.Point[][]) {
//   const polylineLengths: number[] = [];
//   for (const polyline of polylines) {
//     let len = 0;
//     for (let i = 1; i < polyline.length; i++) {
//       const p1 = polyline[i - 1];
//       const p2 = polyline[i];
//       len += Math.sqrt((p2.x - p1.x) ** 2 + (p2.y - p1.y) ** 2);
//     }
//     polylineLengths.push(len);
//     totalLength += len;
//   }
// }
// export function getPercentage(cs: PatrollingType.Connection[], partialCs: PatrollingType.Connection[]) {

// }

export function calculateSvgElementRealSize(
  wrapperWidth: number,
  wrapperHeight: number,
  vbWidth: number,
  vbHeight: number,
  elemWidth: number,
  elemHeight: number,
) {
  const scaleX = wrapperWidth / vbWidth;
  const scaleY = wrapperHeight / vbHeight;
  const scale = Math.min(scaleX, scaleY);

  return {
    realWidth: elemWidth * scale,
    realHeight: elemHeight * scale,
    realX: (wrapperWidth - vbWidth * scale) / 2,
    realY: (wrapperHeight - vbHeight * scale) / 2,
  };
}
