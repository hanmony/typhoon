import { Injectable } from '@angular/core';
import { divIcon, LatLngExpression, Marker, marker } from 'leaflet';

import dayjs from 'dayjs';
import 'proj4leaflet';

import { MetroLine as OccMetroLine } from '../pages/occ/map/metro.line.class';
import { repairStateTextMap } from '../pages/occ/occ.const';
import { OccEventType } from '../pages/occ/occ.event-bus.model';
import { OccEventBusService } from '../pages/occ/occ.event-bus.service';

interface LocationEventDto {
  type?: string;
  position: LatLngExpression;
  positionString: string;
  meta: ExtremeOcc.Event;
}
interface RemoteMarkerMapArrayItem {
  line: string;
  marker?: Marker;
  position: LatLngExpression;
  data: LocationEventDto[];
  positionString: string;
  removed?: LocationEventDto[];
  added?: LocationEventDto[];
  changed?: boolean;
  removeOrAdd?: number;
}

export function getPositionTextFromDto(
  meta: ExtremeOcc.Event | ExtremeOcc.Operation,
  withoutDirection = false,
) {
  if (meta.locationType === '全线') {
    return meta.locationType;
  }
  if (meta.locationType === '自定义') {
    return meta.customPosition;
  }
  if (meta.locationType === '站点' || meta.locationType === '车场') {
    return meta.startStation;
  }
  if (meta.locationType === '区间') {
    return (
      `${meta.startStation} - ${meta.endStation}` +
      (withoutDirection ? '' : ` (${meta.direction})`)
    );
  }
  return '';
}

export const linePositionAdjustments = {
  '5号线': '奉贤新城站',
  '9号线': '上海松江站站',
  '11号线': '花桥站',
  '17号线': '东方绿舟站',
  浦江线: '汇臻路站',
  机场联络线: '虹桥2号航站楼',
  磁浮线: '龙阳路站',
};
export function findAncestorWithAttribute(
  element: HTMLElement,
  prop: string,
): HTMLElement | null {
  let currentElement: HTMLElement | null = element;
  while (currentElement) {
    if (currentElement.hasAttribute(prop)) {
      return currentElement;
    }
    currentElement = currentElement.parentElement;
  }

  return null;
}

export function getPositionFromEvent(
  meta: ExtremeOcc.Event,
  lineModel: OccMetroLine,
) {
  if (meta.locationType === '自定义') {
    return meta.customPosition.split(', ').map(Number);
  }
  if (meta.locationType === '区间') {
    return meta.customPosition.split(', ').map(Number);
  }
  return lineModel.findStationByName(meta.startStation)?.meta.coord;
}

export const REMOTE_DISTINCT_ZOOM = 12;

const symbolPrefix = 'assets/images/occ/map/';
const detailBoxSymbol = symbolPrefix + 'detail-event-box.png';

export const DETAIL_CHANGE_REPAIR_STATE_ATTR = 'detail-change-repair-state';
export const DETAIL_ON_LIST_CHANGE_REPAIR_STATE_ATTR =
  'detail-on-list-change-repair-state';
export const COMPOSE_LIST_BOX_CLICK_ATTR = 'compose-list-box-click';
const imageReaderAttr = `${COMPOSE_LIST_BOX_CLICK_ATTR}-image-reader`;

@Injectable({
  providedIn: 'root',
})
export class SharedEventEffectService {
  constructor(readonly occEventBusService: OccEventBusService) {}

  getDetailPopUpBox(
    data: LocationEventDto,
    repairStateChangeable: boolean,
    composeDetail?: {
      boxSymbol: string;
      iconSize: [number, number];
      iconAnchor: [number, number];
    },
  ) {
    const { position, meta } = data;
    const htmlContent = this.generateDetailPopUpBoxHtml(data, composeDetail);
    const iconSize = composeDetail ? composeDetail.iconSize : [424, 246];
    const iconAnchor = composeDetail
      ? composeDetail.iconAnchor
      : [424 / 2 - 4, 246 + 27];

    const m = marker(position as LatLngExpression, {
      icon: divIcon({
        html: htmlContent,
        className: 'hover-border',
        iconSize: iconSize as [number, number],
        iconAnchor: iconAnchor as [number, number],
      }),
    });

    this.attachDetailPopUpBoxEventHandlers(m, meta, repairStateChangeable);
    return m;
  }

  private generateDetailPopUpBoxHtml(
    data: LocationEventDto,
    composeDetail?: {
      boxSymbol: string;
      iconSize: [number, number];
      iconAnchor: [number, number];
    },
  ): string {
    const { meta } = data;
    const isImportant = meta.severity;
    const animationClass = composeDetail
      ? 'animate__zoomInLeft'
      : 'animate__zoomInUp';
    const backgroundSymbol = composeDetail
      ? composeDetail.boxSymbol
      : detailBoxSymbol;
    const paddingTop = composeDetail ? 'pt-8' : 'pt-7';

    return `
      <div class="w-full h-full relative text-sm animate__animated ${animationClass}"
           style="background: url(${backgroundSymbol}) no-repeat center center; background-size: 100% 100%;">
        <div class="flex justify-between h-full pb-7 ${paddingTop} px-3" style="backdrop-filter: blur(4px);">
          ${this.generateLeftPanelHtml(meta, Boolean(isImportant))}
          ${this.generateRightPanelHtml(data)}
        </div>
      </div>
    `;
  }

  private generateLeftPanelHtml(
    meta: ExtremeOcc.Event,
    isImportant: boolean,
  ): string {
    return `
      <div class="px-3 flex-1">
        ${this.generateEventTypeIndicatorHtml(isImportant)}
        <div>
          ${this.generateFieldHtml('事件类型', meta.eventType === '其他事件' ? meta.otherEvent : meta.eventType)}
          ${this.generateFieldHtml('上报时间', dayjs(meta.createTime).format('YYYY/MM/DD HH:mm'))}
          ${this.generateLocationFieldHtml(meta)}
          ${this.generateDescriptionFieldHtml(meta)}
        </div>
      </div>
    `;
  }

  private generateEventTypeIndicatorHtml(isImportant: boolean): string {
    const checked = this.getCheckedIcon();
    const unchecked = this.getUncheckedIcon();

    return `
      <div class="flex items-center pr-4 mb-2">
        <div class="flex-1 flex items-center" style="margin-right: 6%;">
          <span class="mr-2">普通事件</span>
          <span class="inline-flex items-center justify-center">${!isImportant ? checked : unchecked}</span>
        </div>
        <div class="flex-1 flex items-center">
          <span class="mr-2">重点事件</span>
          <span class="inline-flex items-center justify-center">${isImportant ? checked : unchecked}</span>
        </div>
      </div>
    `;
  }

  private generateFieldHtml(label: string, value: string): string {
    return `
      <div style="margin-bottom: 6px;">
        ${this.getFieldLabel(label)}
        ${this.getFieldValue(value)}
      </div>
    `;
  }

  private generateLocationFieldHtml(meta: ExtremeOcc.Event): string {
    return `
      <div class="flex" style="margin-bottom: 6px;">
        ${this.getFieldLabel('地点')}
        <div class="line-clamp-2">
          ${this.getFieldValue(getPositionTextFromDto(meta))}
        </div>
      </div>
    `;
  }

  private generateDescriptionFieldHtml(meta: ExtremeOcc.Event): string {
    return `
      <div class="line-clamp-3">
        ${this.getFieldLabel('说明备注')}
        <div class="inline h-4 leading-4">
          ${meta.description}
        </div>
      </div>
    `;
  }

  private generateRightPanelHtml(data: LocationEventDto): string {
    const { meta } = data;
    const imageHtml = this.generateImageSectionHtml(meta);
    const infoSectionHtml = this.generateInfoSectionHtml(meta);

    return `
      <div class="flex flex-col items-center pt-2" style="width: 158px; border-left: 1px solid #FFFFFF22">
        ${imageHtml}
        ${infoSectionHtml}
      </div>
    `;
  }

  private generateImageSectionHtml(meta: ExtremeOcc.Event): string {
    const shownImage =
      meta.images.length > 0
        ? '/api' + meta.images[0]
        : symbolPrefix + 'example-image.png';
    const imageReader = meta.images.length
      ? this.generateImageReaderHtml(meta.images.length)
      : '';

    return `
      <div class="overflow-hidden relative" style="border-radius: 10px; border: 1px solid #ffffff; width: 133px; height: 110px;">
        <img src="${shownImage}" class="hidden w-full h-full" />
        <div class="w-full h-full bg-center bg-contain bg-no-repeat" style="background-image: url('${shownImage}');"></div>
        ${imageReader}
      </div>
    `;
  }

  private generateInfoSectionHtml(meta: ExtremeOcc.Event): string {
    const repairStateText = meta.urgentRepair
      ? repairStateTextMap[meta.urgentRepairStatus] || '未处置'
      : '无需抢修';

    const repairStateSelectBoxAttr = 'repairStateSelectBoxAttr' + meta.id;
    const repairStateTextAttr = 'repairStateTextAttr' + meta.id;

    return `
      <div class="relative flex-1 w-full flex justify-between pt-4 pb-1">
        <div class="flex-1 text-center pt-2 flex items-center justify-center">
          ${meta.line}
        </div>
        <div class="flex-1 pt-2 hover:text-cyan-400 hover:opacity-85"
             ${DETAIL_CHANGE_REPAIR_STATE_ATTR}
             style="border-left: 1px solid #FFFFFF22;">
          <div class="text-center pr-2 mb-1">
            <img src="${symbolPrefix + 'repair-state-icon.png'}" style="width: 27px; max-height: 24px;" />
          </div>
          <div ${repairStateTextAttr} class="text-center">${repairStateText}</div>
        </div>
        <div ${repairStateSelectBoxAttr} class="hidden shining-box absolute left-full bottom-0 py-2 text-sm" style="width: 84px;">
          <div class="option-item text-center ${repairStateText === '抢修中' ? 'checked' : ''}" data-value="1">抢修中</div>
          <div class="option-item text-center ${repairStateText === '已结束' ? 'checked' : ''}" data-value="2">已结束</div>
        </div>
      </div>
    `;
  }

  private generateImageReaderHtml(imageCount: number): string {
    return `
      <div ${imageReaderAttr} class="absolute bottom-2 right-2 w-6 h-6 rounded-full bg-black/50 flex items-center justify-center border-solid border hover:bg-blue-500/50 text-white cursor-pointer">
        <div class="text-sm" ${imageReaderAttr}>${imageCount}</div>
      </div>
    `;
  }

  private getFieldLabel(label: string): string {
    return `<div class="inline-block h-4 leading-4 pr-2" style="width: 76px; background: linear-gradient(to right, #00FFFFcc, #00FFFF00, #00FFFF00);">${label}: </div>`;
  }

  private getFieldValue(value: string): string {
    return `<div class="inline h-4 leading-4" style="color: #00FFFF;">${value}</div>`;
  }

  private getCheckedIcon(): string {
    return `<span class="w-3 h-3 rounded-full inline-flex items-center justify-center" style="background: #00FFFF;">
      <svg style="width: 12px; height: 12px; color: #000000;" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" viewBox="0 0 24 24">
        <path d="M5 12l5 5L20 7" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"></path>
      </svg>
    </span>`;
  }

  private getUncheckedIcon(): string {
    return `<span class="inline-block w-3 h-3 rounded-full" style="background: #FFFFFF50;"></span>`;
  }

  private attachDetailPopUpBoxEventHandlers(
    marker: Marker,
    meta: ExtremeOcc.Event,
    repairStateChangeable: boolean,
  ): void {
    const repairStateSelectBoxAttr = 'repairStateSelectBoxAttr' + meta.id;
    const repairStateTextAttr = 'repairStateTextAttr' + meta.id;

    marker.on('click', (p) => {
      const emitDom = p.originalEvent.target as HTMLElement;

      if (emitDom.hasAttribute(imageReaderAttr)) {
        this.handleImageReaderClick(meta.images);
      }

      if (!repairStateChangeable) return;

      if (findAncestorWithAttribute(emitDom, DETAIL_CHANGE_REPAIR_STATE_ATTR)) {
        this.handleRepairStateClick(meta, repairStateSelectBoxAttr);
      }

      if (emitDom.classList.contains('option-item')) {
        this.handleRepairStateOptionClick(
          emitDom,
          repairStateSelectBoxAttr,
          repairStateTextAttr,
          meta,
        );
      }
    });
  }

  private handleImageReaderClick(images: string[]): void {
    this.occEventBusService.dispatch({
      type: OccEventType.READ_IMAGES,
      payload: { images },
    });
  }

  private handleRepairStateClick(
    meta: ExtremeOcc.Event,
    selectBoxAttr: string,
  ): void {
    if (!meta.urgentRepair) return;

    const box = document.querySelector(`[${selectBoxAttr}]`);
    if (box) {
      box.classList.toggle('hidden');
    }
  }

  private handleRepairStateOptionClick(
    emitDom: Element,
    selectBoxAttr: string,
    textAttr: string,
    meta: ExtremeOcc.Event,
  ): void {
    const box = document.querySelector(`[${selectBoxAttr}]`);
    if (!box) return;

    if (!emitDom.classList.contains('checked')) {
      const options = box.querySelectorAll('.option-item');
      if (options) {
        options.forEach((o) => o.classList.remove('checked'));

        emitDom.classList.add('checked');
        const textElement = document.querySelector(`[${textAttr}]`);
        if (textElement) {
          textElement.textContent = emitDom.textContent || '';
        }

        box.classList.toggle('hidden');

        const newStatus = parseInt(
          emitDom.getAttribute('data-value') || '0',
          10,
        );
        this.updateRepairState(meta, newStatus);
      }
    } else {
      box.classList.toggle('hidden');
    }
  }

  private updateRepairState(meta: ExtremeOcc.Event, newStatus: number): void {
    this.occEventBusService.dispatch({
      type: OccEventType.EVENT_UPDATE,
      payload: {
        ...meta,
        urgentRepairStatus: newStatus,
      },
    });

    meta.urgentRepairStatus = newStatus;
  }
}
