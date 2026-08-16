export const downDirectionStations: PatrollingType.RawStation[] = [
  // 龙阳路站 下 88.4,151.5
  {
    center: { x: 88.4, y: 151.5 },
    name: '龙阳路站',
    direction: 'down',
  },
  // 华夏中路站 下 400.3,151.5
  {
    center: { x: 400.3, y: 151.5 },
    name: '华夏中路站',
    direction: 'down',
  },
  // 罗山路站 下 707.5,151.7
  {
    center: { x: 707.5, y: 151.7 },
    name: '罗山路站',
    direction: 'down',
  },
  // 周浦东站 下 1060.6,151.5
  {
    center: { x: 1060.6, y: 151.5 },
    name: '周浦东站',
    direction: 'down',
  },
  // 鹤沙航城站 下 140.3,364.1
  {
    center: { x: 140.3, y: 364.1 },
    name: '鹤沙航城站',
    direction: 'down',
  },
  // 航头东站 下 411.1,364.1
  {
    center: { x: 411.1, y: 364.1 },
    name: '航头东站',
    direction: 'down',
  },
  // 新场站 下 634.3,364.1
  {
    center: { x: 634.3, y: 364.1 },
    name: '新场站',
    direction: 'down',
  },
  // 野生动物园站 下 1000.7,364.1
  {
    center: { x: 1000.7, y: 364.1 },
    name: '野生动物园站',
    direction: 'down',
  },
  // 惠南站 下 371.6,573.7
  {
    center: { x: 371.6, y: 573.7 },
    name: '惠南站',
    direction: 'down',
  },
  // 惠南东站 下 698.2,573.7
  {
    center: { x: 698.2, y: 573.7 },
    name: '惠南东站',
    direction: 'down',
  },
  // 书院站 下 236.4,842.1
  {
    center: { x: 236.4, y: 842.1 },
    name: '书院站',
    direction: 'down',
  },
  // 临港大道站 下 668.2,866.2
  {
    center: { x: 668.2, y: 866.2 },
    name: '临港大道站',
    direction: 'down',
  },
  // 滴水湖站 下 1026.7,866.2
  {
    center: { x: 1026.7, y: 866.2 },
    name: '滴水湖站',
    direction: 'down',
  },
];

export const upDirectionStations: PatrollingType.RawStation[] = [
  // 龙阳路站 上 88.4,188
  {
    center: { x: 88.4, y: 188 },
    name: '龙阳路站',
    direction: 'up',
  },
  // 华夏中路站 上 400.3,188
  {
    center: { x: 400.3, y: 188 },
    name: '华夏中路站',
    direction: 'up',
  },
  // 罗山路站 上 707.5,187.8
  {
    center: { x: 707.5, y: 187.8 },
    name: '罗山路站',
    direction: 'up',
  },
  // 周浦东站 上 1060.6,188
  {
    center: { x: 1060.6, y: 188 },
    name: '周浦东站',
    direction: 'up',
  },
  // 鹤沙航城站 上 139.9,400.6
  {
    center: { x: 139.9, y: 400.6 },
    name: '鹤沙航城站',
    direction: 'up',
  },
  // 航头东站 上 411.1,400.6
  {
    center: { x: 411.1, y: 400.6 },
    name: '航头东站',
    direction: 'up',
  },
  // 新场站 上 634.5,401
  {
    center: { x: 634.5, y: 401 },
    name: '新场站',
    direction: 'up',
  },
  // 野生动物园站 上 1000.7,401
  {
    center: { x: 1000.7, y: 401 },
    name: '野生动物园站',
    direction: 'up',
  },
  // 惠南站 上 371.6,610.6
  {
    center: { x: 371.6, y: 610.6 },
    name: '惠南站',
    direction: 'up',
  },
  // 惠南东站 上 698.2,610.6
  {
    center: { x: 698.2, y: 610.6 },
    name: '惠南东站',
    direction: 'up',
  },
  // 书院站 上 236.4,926.6
  {
    center: { x: 236.4, y: 926.6 },
    name: '书院站',
    direction: 'up',
  },
  // 临港大道站 上 668.2,902.5
  {
    center: { x: 668.2, y: 902.5 },
    name: '临港大道站',
    direction: 'up',
  },
  // 滴水湖站 上 1026.7,902.5
  {
    center: { x: 1026.7, y: 902.5 },
    name: '滴水湖站',
    direction: 'up',
  },
];

export default [...downDirectionStations, ...upDirectionStations].map((s) => ({
  ...s,
  type: 'station',
  nameKey: `${s.name}:${s.direction}`,
}));
