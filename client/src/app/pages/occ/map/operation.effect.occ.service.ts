import { Injectable } from '@angular/core';
import { FeatureGroup, LeafletEvent, Map as LeafMap } from 'leaflet';
import 'proj4leaflet';
import { operationOnMapVisibilityFilter } from '../occ.const';
import { diffOperations } from './diff.util';
import { MetroLine as OccMetroLine } from './metro.line.class';

@Injectable({
  providedIn: 'root',
})
export class OccMapOperationEffectService {
  initiated = false;
  map!: LeafMap;
  lineModels: OccMetroLine[] = [];
  featureGroup = new FeatureGroup([]);

  operations: ExtremeOcc.Operation[] = [];

  isTemporaryHiding = false;
  visible = true;

  setVisibility(visible: boolean) {
    this.visible = visible;
    if (this.visible) {
      this.revert();
    } else {
      this.hide();
    }
  }

  showEffect() {
    this.operations.forEach((op) => {
      this.effectWithOperation(op);
    });
    this.bringAllEffectToFrontInOrder();
  }

  diffOperationsAndEffect(allOps: ExtremeOcc.Operation[]) {
    // 过滤掉不显示的运营调整 (isShow and time)
    const ops = allOps.filter(operationOnMapVisibilityFilter);

    if (!this.lineModels.length || this.isTemporaryHiding) {
      this.operations = ops;
      return;
    }
    const { removed, added } = diffOperations(ops, this.operations);
    const removedOps = removed.map((op) => op.id);
    const OmitRemovedOps = this.operations.filter(
      (op) => !removedOps.includes(op.id),
    );
    if (this.visible && !this.isTemporaryHiding) {
      added.forEach((op) => {
        this.effectWithOperation(op);
      });
      OmitRemovedOps.forEach((op) => {
        this.effectWithOperation(op);
      });
    }
    removed.forEach((op) => {
      this.removeEffectWithOperation(op);
    });
    this.operations = ops;
    this.bringAllEffectToFrontInOrder();
  }

  setRunningColor(lineName: string) {
    const lineModel = this.lineModels.find((l) => l.meta.name === lineName);
    lineModel?.setRunningColor();
  }
  revertColor(lineName: string) {
    const lineModel = this.lineModels.find((l) => l.meta.name === lineName);
    lineModel?.revertColor();
  }

  mount(map: LeafMap, lineModels: OccMetroLine[]) {
    this.map = map;
    this.lineModels = lineModels;
    this.featureGroup.addTo(this.map);
    map.on('zoomend', (ev) => {
      this.onMapZoom(ev);
    });
  }
  onMapZoom(event: LeafletEvent) {}

  effectWithOperation(op: ExtremeOcc.Operation) {
    if (!this.lineModels.length) return;
    const { actionType, startStation, endStation, locationType } = op;
    if (actionType === '站点关闭') {
      this.effectCloseOperation(op);
      return;
    }
    const lineModel = this.lineModels.find((l) => l.meta.name === op.line)!;
    const combinedId = this.getCombinedId(op);
    lineModel.stopEffect(combinedId);
    if (actionType === '停运') {
      if (locationType === '全线') {
        lineModel.flashRed(combinedId, '全线', endStation);
      } else {
        lineModel.flashRed(combinedId, startStation, endStation);
      }
    } else if (actionType === '间隔调整') {
      lineModel.flashDeepGreen(combinedId, startStation, endStation);
    } else if (actionType === '交路调整') {
      lineModel.flashPurple(combinedId, startStation, endStation);
    } else if (actionType === '限速') {
      lineModel.highlightYellow(combinedId, startStation, endStation);
    } else if (actionType === '正线留车') {
      this.effectParkOperation(op);
    } else if (actionType === '站点关闭') {
      this.effectCloseOperation(op);
    }
  }

  effectCloseOperation(op: ExtremeOcc.Operation) {
    const { startStation } = op;
    const lineModel = this.lineModels.find((l) => l.meta.name === op.line)!;
    const station = lineModel.findStationByName(startStation);
    if (station) {
      // 1 全部关闭， 2 部分关闭
      station.setStateColor(op.close === 1 ? 'red' : 'orange');
    }
  }
  effectParkOperation(op: ExtremeOcc.Operation) {
    const { startStation } = op;
    const lineModel = this.lineModels.find((l) => l.meta.name === op.line)!;
    const station = lineModel.findStationByName(startStation);
    if (station) {
      station.setStateColor('#a855f7');
    }
  }
  getCombinedId(op: ExtremeOcc.Operation) {
    const { locationType, startStation, endStation } = op;
    let combinedId = `${op.id}-${startStation}-${endStation}`;
    if (locationType === '全线') {
      combinedId = `${op.id}-全线-${endStation}`;
    }
    return combinedId;
  }

  removeEffectWithOperation(op: ExtremeOcc.Operation) {
    const { actionType, startStation } = op;
    const combinedId = this.getCombinedId(op);
    const lineModel = this.lineModels.find((l) => l.meta.name === op.line)!;
    const station = lineModel.findStationByName(startStation);
    if (station) {
      if (actionType === '站点关闭' || actionType === '正线留车') {
        station.setStateColor('');
      } else {
        lineModel.stopEffect(combinedId);
      }
    } else {
      if (op.locationType === '全线') {
        lineModel.stopEffect(combinedId);
      }
    }
  }
  bringAllEffectToFrontInOrder() {
    if (!this.lineModels.length) return;
    this.operations.forEach((op) => {
      const { actionType } = op;
      const lineModel = this.lineModels.find((l) => l.meta.name === op.line)!;
      const combinedId = this.getCombinedId(op);
      if (actionType === '间隔调整') {
        lineModel.bringEffectToFront(combinedId);
      }
    });
    this.operations.forEach((op) => {
      const { actionType } = op;
      const lineModel = this.lineModels.find((l) => l.meta.name === op.line)!;
      const combinedId = this.getCombinedId(op);
      if (actionType === '停运') {
        lineModel.bringEffectToFront(combinedId);
      }
    });
  }
  hide() {
    this.operations.forEach((op) => {
      this.removeEffectWithOperation(op);
    });
  }
  temporaryHideEffect() {
    this.isTemporaryHiding = true;
    this.hide();
  }
  revert() {
    this.operations.forEach((op) => {
      this.effectWithOperation(op);
    });
  }
  revertTemporaryEffect() {
    this.isTemporaryHiding = false;
    if (!this.visible) return;
    this.operations.forEach((op) => {
      this.effectWithOperation(op);
    });
  }
}

@Injectable({
  providedIn: 'root',
})
export class DashboardMapOperationEffectService extends OccMapOperationEffectService {}
