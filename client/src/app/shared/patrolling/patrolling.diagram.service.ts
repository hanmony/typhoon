import { Injectable } from '@angular/core';
import { getLineMetaByLineName } from './meta';
import { PatrollingLine } from './patrolling.line.class';

/**
 * 寻道服务
 * ！ 注意该服务仅提供方法，不允许存储状态
 */
@Injectable({
  providedIn: 'root',
})
export class PatrollingDiagramService {
  constructor() {}
  getLineMeta(lineName: string) {
    return getLineMetaByLineName(lineName);
  }
  getLineDiagramModel(lineName: string) {
    const metaData = getLineMetaByLineName(lineName);
    if (!metaData) return undefined;
    return new PatrollingLine({
      name: lineName,
      meta: metaData,
    });
  }
}
