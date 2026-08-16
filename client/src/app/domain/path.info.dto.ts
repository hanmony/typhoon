export class PathInfoDto {
  _id: string = '';
  // 台风ID
  caseId: string = '';
  // 时间点
  time: string = '';
  // 经度
  longitude: number = 0;
  // 纬度
  latitude: number = 0;
  // 风力风速
  power: string = '';
  // 中心气压
  pressure: string = '';
  // 风圈半径
  radius?: string = '';
  // 登陆信息
  landing?: string = '';

  __v: number = 0;
}
