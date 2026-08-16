declare namespace ExternalTyphoonWeb {
  interface WindRadius {
    ne: number; //东北象限半径
    nw: number; //西北象限半径
    se: number; //东南象限半径
    sw: number; //西南象限半径
  }

  interface ActiveTyphoonTrack {
    lat: number; //台风中心所在纬度
    lon: number; //台风中心所在经度
    wind_class: string; //台风中心最大风级
    wind_speed: number; //台风中心附近最大风速，单位：m/s
    level: string; //台风强度等级
    pressure: number; //中心最低气压，单位：hPa
    move_dir: string; //移动方向
    move_sp: number; //移动速度，单位：km/h
    radius7: WindRadius; //7级风圈半径，单位：km
    radius10: WindRadius; //10级风圈半径，单位：km
    radius12: WindRadius; //12级风圈半径，单位：km
    ck_position: string; //参考位置
    trend: string; //未来趋势
    data_time: string; //数据时间
  }

  interface ActiveTyphoonForecastPoint {
    lat: number; //台风中心所在纬度
    lon: number; //台风中心所在经度
    wind_class: string; //台风中心最大风级
    wind_speed: number; //台风中心附近最大风速，单位：m/s
    level: string; //台风强度等级
    pressure: number; //中心最低气压，单位：hPa
    data_time: string; //数据时间
  }

  interface ActiveTyphoonLand {
    level: string; //登陆强度等级
    land_time: string; //登陆时间
    land_adr: string; //登陆地点
    land_info: string; //登陆信息
  }

  interface ActiveTyphoonInfo {
    tfid: string; //台风编号
    name: string; //台风中文名
    name_en: string; //台风英文名
    is_active: 0 | 1; //是否活跃中，0表示已消散，1表示活跃中
    starttime: string; //台风生成时间
    endtime: string; //台风最新路径点时间
    tracks: ActiveTyphoonTrack[]; //实况路径点信息
    forecasts: ActiveTyphoonForecastPoint[]; //各机构预报信息，key为机构标识如"cn"
    lands: ActiveTyphoonLand[]; //登陆信息
  }

  interface TyphoonListItem extends TyphoonData {}

  export interface TyphoonData {
    tfid: string;
    name: string;
    enname: string;
    isactive: string;
    starttime: string;
    endtime: string;
    warnlevel: string;
    centerlng: string;
    centerlat: string;
    land: LandInfo[];
    points: TyphoonPoint[];
  }

  interface LandInfo {
    landaddress: string;
    landtime: string;
    lng: string;
    lat: string;
    info: string;
    strong: string;
  }

  interface TyphoonPoint {
    time: string;
    lng: string;
    lat: string;
    strong: string;
    power: string;
    speed: string;
    pressure: string;
    movespeed: string;
    movedirection: string;
    radius7: string;
    radius10: string;
    radius12: string;
    forecast: ForecastInfo[];
    ckposition: null | string;
    jl: null | string;
  }

  interface ForecastInfo {
    tm: string;
    forecastpoints: ForecastPoint[];
  }

  interface ForecastPoint {
    time: string;
    lng: string;
    lat: string;
    strong: string;
    power: string;
    speed: string;
    pressure: string;
    tm?: string;
    ybsj?: string;
  }
}
