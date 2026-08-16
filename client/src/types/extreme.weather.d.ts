declare namespace Extreme {
  interface WeatherAlertColor {
    code: string;
    red: number;
    green: number;
    blue: number;
    alpha: number;
  }

  interface WeatherAlertEventType {
    name: string;
    code: string;
  }

  interface WeatherAlertMessageType {
    code: string;
    supersedes: string[];
  }

  interface WeatherAlertDto {
    id: string;
    senderName: string;
    issuedTime: string;
    messageType: WeatherAlertMessageType;
    eventType: WeatherAlertEventType;
    urgency: string | null;
    severity: string;
    certainty: string | null;
    icon: string;
    color: WeatherAlertColor;
    effectiveTime: string;
    onsetTime: string;
    expireTime: string;
    headline: string;
    description: string;
    criteria: string;
    responseTypes: string[];
    instruction: string;
  }

  interface WeatherDto {
    forecaster: string;
    publishtime: string;
    title: string;
    alertname: string;
    warningstate: string;
    preupdatelevel: string;
    alertlevel: string;
    info: string;
    defenseguideline: string;
    publishtimes: string;
    alertnames: string;
    alertlevels: string;
    isEnd: number;
    endtime: string;
  }
  type WeatherResponse = WeatherDto[];
  type WeatherAlertResponse = WeatherAlertDto[];

  interface DutyItem {
    /** 值班日期 YYYY-MM-DD，5 天化后必填；兼容旧数据可为空 */
    date?: string;
    department: string;
    responsible: string;
  }

  interface Notification {
    title: string;
    content: string;
    type: string;
    lines: string[];
    eventIds: string[];
    id: string;
    createTime: string;
    updateTime: string;
    commandId: string;
  }

  interface NotificationWithReadState extends Notification {
    isRead: number;
  }

  interface NotificationCreateParams {
    title: string;
    content: string;
    type: string;
    lines: string[];
    eventIds: string[];
  }
}
