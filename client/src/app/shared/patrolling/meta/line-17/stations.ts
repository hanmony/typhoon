export const downDirectionStations: PatrollingType.RawStation[] = [
  // 西岑站 下 198.8,79.3
  {
    center: { x: 198.8, y: 79.3 },
    name: '西岑站',
    direction: 'down',
  },
  //  东方绿舟站 下 589,79.3
  {
    center: { x: 589, y: 79.3 },
    name: '东方绿舟站',
    direction: 'down',
  },
  // 朱家角站 下  967.5,79.3
  {
    center: { x: 967.5, y: 79.3 },
    name: '朱家角站',
    direction: 'down',
  },
  // 淀山湖大道站 下 339.9,272
  {
    center: { x: 339.9, y: 272 },
    name: '淀山湖大道站',
    direction: 'down',
  },
  // 漕盈路站 下 580.6,272
  {
    center: { x: 580.6, y: 272 },
    name: '漕盈路站',
    direction: 'down',
  },
  // 青浦新城站 下 764.5,272
  {
    center: { x: 764.5, y: 272 },
    name: '青浦新城站',
    direction: 'down',
  },
  // 汇金路站 下 1039,272
  {
    center: { x: 1039, y: 272 },
    name: '汇金路站',
    direction: 'down',
  },
  // 赵巷站 下 207.8,450.6
  {
    center: { x: 207.8, y: 450.6 },
    name: '赵巷站',
    direction: 'down',
  },
  // 嘉松中路站 下 517,450.6
  {
    center: { x: 517, y: 450.6 },
    name: '嘉松中路站',
    direction: 'down',
  },
  // 徐泾北城站 下 707.9,450.6
  {
    center: { x: 707.9, y: 450.6 },
    name: '徐泾北城站',
    direction: 'down',
  },
  // 徐盈路站 下 994.5,450.6
  {
    center: { x: 994.5, y: 450.6 },
    name: '徐盈路站',
    direction: 'down',
  },
  // 蟠龙路站 下 122.1,629.2
  {
    center: { x: 122.1, y: 629.2 },
    name: '蟠龙路站',
    direction: 'down',
  },
  // 国家会展中心站 下 393.3,629.2
  {
    center: { x: 393.3, y: 629.2 },
    name: '国家会展中心站',
    direction: 'down',
  },
  // 虹桥火车站站 下 711,629.2
  {
    center: { x: 711, y: 629.2 },
    name: '虹桥火车站站',
    direction: 'down',
  },
];

export const upDirectionStations: PatrollingType.RawStation[] = [
  // 西岑站 上 199.9,124.5
  {
    center: { x: 199.9, y: 124.5 },
    name: '西岑站',
    direction: 'up',
  },
  //  东方绿舟站 上 589,124.5
  {
    center: { x: 589, y: 124.5 },
    name: '东方绿舟站',
    direction: 'up',
  },
  // 朱家角站 上  967.5,124.5
  {
    center: { x: 967.5, y: 124.5 },
    name: '朱家角站',
    direction: 'up',
  },
  // 淀山湖大道站 上 339.9,317.3
  {
    center: { x: 339.9, y: 317.3 },
    name: '淀山湖大道站',
    direction: 'up',
  },
  // 漕盈路站 上 580.6,317.3
  {
    center: { x: 580.6, y: 317.3 },
    name: '漕盈路站',
    direction: 'up',
  },
  // 青浦新城站 上 764.5,317.3
  {
    center: { x: 764.5, y: 317.3 },
    name: '青浦新城站',
    direction: 'up',
  },
  // 汇金路站 上 1039,317.3
  {
    center: { x: 1039, y: 317.3 },
    name: '汇金路站',
    direction: 'up',
  },
  // 赵巷站 上 207.8,495.8
  {
    center: { x: 207.8, y: 495.8 },
    name: '赵巷站',
    direction: 'up',
  },
  // 嘉松中路站 上 517,495.8
  {
    center: { x: 517, y: 495.8 },
    name: '嘉松中路站',
    direction: 'up',
  },
  // 徐泾北城站 上 707.9,495.8
  {
    center: { x: 707.9, y: 495.8 },
    name: '徐泾北城站',
    direction: 'up',
  },
  // 徐盈路站 上 994.5,495.8
  {
    center: { x: 994.5, y: 495.8 },
    name: '徐盈路站',
    direction: 'up',
  },
  // 蟠龙路站 上 122.1,674.4
  {
    center: { x: 122.1, y: 674.4 },
    name: '蟠龙路站',
    direction: 'up',
  },
  // 国家会展中心站 上 393.3,674.4
  {
    center: { x: 393.3, y: 674.4 },
    name: '国家会展中心站',
    direction: 'up',
  },
  // 虹桥火车站站 上 711,674.4
  {
    center: { x: 711, y: 674.4 },
    name: '虹桥火车站站',
    direction: 'up',
  },
];

export default [...downDirectionStations, ...upDirectionStations].map((s) => ({
  ...s,
  type: 'station',
  nameKey: `${s.name}:${s.direction}`,
}));
