import { ActionCategory } from '../../domain/action.category';

export const lineOptions: Option<string>[] = [
  '1号线',
  '2号线',
  '3号线',
  '4号线',
  '5号线',
  '6号线',
  '7号线',
  '8号线',
  '9号线',
  '10号线',
  '11号线',
  '12号线',
  '13号线',
  '14号线',
  '15号线',
  '16号线',
  '17号线',
  '18号线',
  '浦江线',
  '磁浮线',
  '3/4号线',
].map((e) => {
  if (e === '3/4号线') {
    return { label: e, value: '3号线4号线共线段' };
  }
  return { label: e, value: e };
});

// 运营事件
export const opEventsOptions: Option<string>[] = [
  // 树枝侵限，异物侵限，设备故障，渗漏水，积水
  '树枝侵限',
  '异物侵限',
  '设备故障',
  '渗漏水',
  '积水',
].map((e) => ({ label: e, value: e }));

// 行车措施
export const trafficMeasuresOptions: Option<string>[] = [
  // 停运、交路调整、间隔调整、正线留车、提前巡道、限速
  '停运',
  '交路调整',
  '间隔调整',
  '正线留车',
  '提前巡道',
  '限速',
].map((e) => ({ label: e, value: e }));

// 客运措施
export const passengerTransportMeasuresOptions: Option<string>[] = [
  // 关闭车站，关闭出入口
  '关闭车站',
  '关闭出入口',
].map((e) => ({ label: e, value: e }));

// 客运处置
export const passengerDisposalOptions: Option<string>[] = [];

// 施工调整
export const constructionAdjustmentOptions: Option<string>[] = [
  // 取消施工，调整时间，调整区段，新增施工
  '取消施工',
  '调整时间',
  '调整区段',
  '新增施工',
].map((e) => ({ label: e, value: e }));

export const localEventCategories = [
  { name: '运营事件', key: ActionCategory.opevent, items: opEventsOptions },
  {
    name: '行车措施',
    key: ActionCategory.driving,
    items: trafficMeasuresOptions,
  },
  {
    name: '客运处置',
    key: ActionCategory.disposal,
    items: passengerDisposalOptions,
  },
  {
    name: '施工调整',
    key: ActionCategory.construction,
    items: constructionAdjustmentOptions,
  },
  {
    name: '客运措施',
    key: ActionCategory.transport,
    items: passengerTransportMeasuresOptions,
  },
];
