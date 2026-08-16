import { Injectable } from '@angular/core';
import 'proj4leaflet';
import { CaseDetailComponent } from '../case-detail.component';
import { MetroLine } from './classes/metro.line.class';
import { clearGlobalStationToLineMap } from './classes/metro.station.class';
import { ILineData, linesData } from './meta';

@Injectable({
  providedIn: 'root',
})
export class MetroService {
  models: MetroLine[] = [];
  constructor() {}
  getMetroData() {
    return {
      lines: linesData,
    };
  }
  getLineModel(lineData: ILineData, caseComponent?: CaseDetailComponent) {
    return new MetroLine({
      meta: lineData,
      caseComponent,
    });
  }
  setModels(models: MetroLine[]) {
    this.models = models;
  }
  clearStationsCache() {
    clearGlobalStationToLineMap();
  }
  setRunningColor() {
    this.models.forEach((l) => {
      l.setRunningColor();
    });
  }
  revertColor() {
    this.models.forEach((l) => {
      l.revertColor();
    });
  }
  followVisibility(lines: string[]) {
    this.models.forEach((l) => {
      l.followVisibility(lines);
    });
  }
  show() {
    this.models.forEach((l) => {
      l.show();
    });
  }
}
