import { Injectable } from '@angular/core';

import dayjs from 'dayjs';

import { _BaseApi } from './_base';

const weatherAlertColorToChinese: Record<string, string> = {
  blue: '蓝色',
  yellow: '黄色',
  orange: '橙色',
  red: '红色',
};

const weatherAlertMessageCodeToChinese: Record<string, string> = {
  alert: '发布',
  update: '更新',
  cancel: '解除',
};

export function transformWeatherAlertToWeatherDto(
  alert: Extreme.WeatherAlertDto,
): Extreme.WeatherDto {
  const colorChinese = weatherAlertColorToChinese[alert.color?.code] || '';
  const isEnded =
    alert.messageType?.code === 'cancel' ||
    (alert.expireTime && dayjs(alert.expireTime).isBefore(dayjs()));
  return {
    forecaster: alert.senderName || '',
    publishtime: alert.issuedTime || '',
    title: alert.headline || '',
    alertname: alert.eventType?.name || '',
    warningstate:
      weatherAlertMessageCodeToChinese[alert.messageType?.code] || '',
    preupdatelevel: '',
    alertlevel: colorChinese,
    info: alert.description || '',
    defenseguideline: alert.instruction || '',
    publishtimes: alert.issuedTime
      ? dayjs(alert.issuedTime).format('YYYY年MM月DD日 HH:mm:ss')
      : '',
    alertnames: '',
    alertlevels: '',
    isEnd: isEnded ? 1 : 0,
    endtime: alert.expireTime || '',
  };
}

function windRadiusToString(r?: ExternalTyphoonWeb.WindRadius): string {
  if (!r) return '';
  return [r.ne, r.se, r.nw, r.sw].join('|');
}

export function transformActiveTyphoonToTyphoonListItem(
  info: ExternalTyphoonWeb.ActiveTyphoonInfo,
): ExternalTyphoonWeb.TyphoonListItem {
  if (!info.tracks) info.tracks = [];
  return {
    tfid: info.tfid,
    name: info.name,
    enname: info.name_en,
    isactive: String(info.is_active),
    starttime: info.starttime,
    endtime: info.endtime,
    warnlevel: '',
    centerlng: info.tracks.length
      ? String(info.tracks[info.tracks.length - 1].lon)
      : '',
    centerlat: info.tracks.length
      ? String(info.tracks[info.tracks.length - 1].lat)
      : '',
    // centerlng: '126.550000',
    // centerlat: '34.350000',
    land: (info.lands || []).map((l) => ({
      landaddress: l.land_adr,
      landtime: l.land_time,
      lng: '',
      lat: '',
      info: l.land_info,
      strong: l.level,
    })),
    points: info.tracks.map((t) => ({
      time: t.data_time,
      lng: String(t.lon),
      lat: String(t.lat),
      strong: t.level,
      power: t.wind_class,
      speed: String(t.wind_speed),
      pressure: String(t.pressure),
      movespeed: String(t.move_sp),
      movedirection: t.move_dir,
      radius7: windRadiusToString(t.radius7),
      radius10: windRadiusToString(t.radius10),
      radius12: windRadiusToString(t.radius12),
      forecast:
        t === info.tracks[info.tracks.length - 1] && info.forecasts?.length
          ? [
              {
                tm: '中国',
                forecastpoints: info.forecasts.map((f) => ({
                  time: f.data_time,
                  lng: String(f.lon),
                  lat: String(f.lat),
                  strong: f.level,
                  power: f.wind_class,
                  speed: String(f.wind_speed),
                  pressure: String(f.pressure),
                })),
              },
            ]
          : [],
      ckposition: t.ck_position,
      jl: t.trend,
    })),
  };
}

@Injectable({ providedIn: 'root' })
export class ExtremeApi extends _BaseApi {
  async validateCommandPlatform(): Promise<ExtremeCommand.InfoResponse> {
    return this.http.get('/typhoonCommand/info');
  }

  async getTyphoonCommandDetail(): Promise<ExtremeCommand.TyphoonCommandDetail> {
    return this.http.get('/typhoonCommand/detail');
  }

  async initiateCommandSimulation(name: string, t: string) {
    return this.http.post('/typhoonCommand/add', {
      name,
      isSimulated: 1,
      simulateStartTime: t,
    });
  }

  async initiateCommand(name: string) {
    return this.http.post('/typhoonCommand/add', { name, isSimulated: 0 });
  }

  async terminateCommand() {
    return this.http.get('/typhoonCommand/close');
  }

  async updateEmergencyResponse(
    params: Pick<
      ExtremeCommand.InfoItem,
      'municipalDegree' | 'corporateDegree' | 'municipalFlag' | 'corporateFlag'
    >,
  ) {
    return this.http.post('/typhoonCommand/updateEmergencyResponse', params);
  }

  async updateSimulateStartTime(t: string) {
    return this.http.post('/typhoonCommand/updateSimulateStartTime', {
      simulateStartTime: t,
    });
  }

  async getTyphoonList(): Promise<ExternalTyphoonWeb.TyphoonListItem[]> {
    // return mockQw.map(transformActiveTyphoonToTyphoonListItem);
    const list = await this.getActiveTyphoonList();
    return list.map(transformActiveTyphoonToTyphoonListItem);
  }

  async getActiveTyphoonList(): Promise<
    ExternalTyphoonWeb.ActiveTyphoonInfo[]
  > {
    return this.http.get('/typhoon/activity');
  }

  async addOccEvent(data: ExtremeOcc.EventAddParams): Promise<void> {
    return this.http.post('/extreme/event/add', data);
  }

  async updateOccEvent(data: Partial<ExtremeOcc.Event>): Promise<void> {
    return this.http.post('/extreme/event/update', data);
  }

  async partialUpdateOccEvent(
    data: Partial<ExtremeOcc.Event> & { id: string },
  ): Promise<void> {
    return this.http.post('/extreme/event/partial-update', data);
  }

  async getOccEvents(): Promise<ExtremeOcc.Event[]> {
    return this.http.get('/extreme/event/all');
  }

  async getOccEventInfo(line: string): Promise<ExtremeOcc.EventInfo> {
    return this.http.get('/extreme/event/info', { line });
  }

  async addOccOperation(data: ExtremeOcc.OperationAddParams): Promise<void> {
    return this.http.post('/extreme/operation/add', data);
  }

  async updateOccOperation(data: Partial<ExtremeOcc.Operation>): Promise<void> {
    return this.http.post('/extreme/operation/update', data);
  }

  async partialUpdateOperation(
    data: Partial<ExtremeOcc.Operation> & { id: string },
  ): Promise<void> {
    return this.http.post('/extreme/operation/partial-update', data);
  }

  async batchUpdateOperations(
    ids: string[],
    data: Partial<ExtremeOcc.Operation>,
  ): Promise<void> {
    return this.http.post('/extreme/operation/batch-partial-update', {
      ids,
      data,
    });
  }

  async addOpDetail(data: ExtremeOcc.OpDetailAddParams): Promise<void> {
    return this.http.post('/extreme/operation/add-detail', data);
  }

  async updateOpDetail(data: Partial<ExtremeOcc.OpDetail>): Promise<void> {
    return this.http.post('/extreme/operation/update-detail', data);
  }

  async getOpDetailList(): Promise<ExtremeOcc.OpDetail[]> {
    return this.http.get('/extreme/operation/all-detail');
  }

  async getOccOperationList(): Promise<ExtremeOcc.Operation[]> {
    return this.http.get('/extreme/operation/all');
  }

  async removeOccEvent(id: string): Promise<void> {
    return this.http.get('/extreme/event/remove', { id });
  }

  async removeOccOperation(id: string): Promise<void> {
    return this.http.get('/extreme/operation/remove', { id });
  }

  async getExtremeWeather(): Promise<Extreme.WeatherResponse> {
    const list = await this.http.get<Extreme.WeatherAlertResponse>(
      '/typhoon/severe-weather',
    );
    return list.map(transformWeatherAlertToWeatherDto);
  }

  async getDutyInfo(): Promise<Extreme.DutyItem[]> {
    return this.http.get('/typhoonDuty/list');
  }

  async batchUpdateDutyInfo(data: Extreme.DutyItem[]): Promise<void> {
    return this.http.post('/typhoonDuty/batchUpdate', data);
  }

  async getNotificationList(): Promise<Extreme.NotificationWithReadState[]> {
    return this.http.get('/extreme/message/padAll');
  }

  async getNotifications(): Promise<Extreme.Notification[]> {
    return this.http.get('/extreme/message/all');
  }

  async addNotification(data: Extreme.NotificationCreateParams): Promise<void> {
    return this.http.post('/extreme/message/add', data);
  }

  async removeNotification(id: string) {
    return this.http.get('/extreme/message/remove', { id });
  }

  async readNotification(id: string) {
    return this.http.get('/extreme/message/read', { id });
  }

  async getPassTime(): Promise<string[]> {
    return this.http.get('/typhoon/passTime');
  }
  async getWeatherRecord(): Promise<Extreme.WeatherResponse> {
    const list = await this.http.get<Extreme.WeatherAlertResponse>(
      '/typhoon/severe-weather-history',
    );
    return list.map(transformWeatherAlertToWeatherDto);
  }
}
