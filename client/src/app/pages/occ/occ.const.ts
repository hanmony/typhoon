export const occEventTypes = [
  '树枝侵限',
  '异物侵限',
  '设备故障',
  '渗漏水',
  '积水',
  '列车故障',
  '基地事件',
  '其他事件',
];

export const occEventCategoryMap = {
  encroachment: ['树枝侵限', '异物侵限'],
  waterLogging: ['积水', '渗漏水'],
  equipmentFailure: ['设备故障'],
  trainFailure: ['列车故障'],
  base: ['基地事件'],
  other: ['其他事件'],
};

export const occEventCategories = [
  {
    label: '侵限事件',
    contains: occEventCategoryMap.encroachment,
  },
  {
    label: '积水事件',
    contains: occEventCategoryMap.waterLogging,
  },
  {
    label: '设备故障',
    contains: occEventCategoryMap.equipmentFailure,
  },
  {
    label: '列车故障',
    contains: occEventCategoryMap.trainFailure,
  },
  {
    label: '基地事件',
    contains: occEventCategoryMap.base,
  },
  {
    label: '其他事件',
    contains: occEventCategoryMap.other,
  },
];

export const actions: { name: string; key: string }[] = [
  {
    name: '新增事件',
    key: 'add-event',
  },
  {
    name: '运营调整',
    key: 'operation-adjustment',
  },
  {
    name: '模拟巡道',
    key: 'simulate-patrolling',
  },
];

export const operationSubActions: { name: string; key: string }[] = [
  {
    name: '停运',
    key: 'stop-operation',
  },
  // {
  //   name: '交路调整',
  //   key: 'route-adjustment',
  // },
  {
    name: '间隔调整',
    key: 'interval-adjustment',
  },
  {
    name: '正线留车',
    key: 'reserve-train',
  },
  {
    name: '限速',
    key: 'speed-limit',
  },
  {
    name: '站点关闭',
    key: 'station-close',
  },
];

// 区间填报方向选项。4号线为环线,用「内圈/外圈/内外圈」替代上下行。
const directionOptionsByLine: Record<string, string[]> = {
  '4号线': ['内圈', '外圈', '内外圈'],
};
const defaultDirectionOptions = ['上行', '下行', '上下行'];

export const getDirectionOptions = (line: string): string[] =>
  directionOptionsByLine[line] || defaultDirectionOptions;

export const effectDurationOptions: Option[] = [
  { label: '预计5分钟以上', value: 1 },
  { label: '预计15分钟以上', value: 2 },
  { label: '预计30分钟以上', value: 3 },
];

export const getEffectDurationLabel = (v: number) =>
  effectDurationOptions.find((op) => op.value === v)?.label || '';

export const getEffectDurationValue = (label: string) =>
  (effectDurationOptions.find((op) => op.label === label)?.value as number) ||
  0;

export function getEventEffectDurationText(event: ExtremeOcc.Event) {
  if (!event.effect) return '无影响';
  return getEffectDurationLabel(event.effectDuration);
}

export const getActionByKey = (key: string) => {
  return actions.find((action) => action.key === key);
};

export const getOperationSubActionByKey = (key: string) => {
  return operationSubActions.find((action) => action.key === key);
};

export const isOperationSubAction = (key: string | null) => {
  return operationSubActions.some((action) => action.key === key);
};

export const repairStateTextMap = {
  0: '未处置',
  1: '抢修中',
  2: '已结束',
};

export const repairUnits = [
  '维保车辆',
  '维保通号',
  '维保工务',
  '维保供电',
  '维保后勤',
  '运营公司',
];

export function getEventRepairStateText(event: ExtremeOcc.Event) {
  let repairStateText = '';
  if (event.urgentRepair) {
    repairStateText = repairStateTextMap[event.urgentRepairStatus] || '未处置';
  } else {
    repairStateText = '无需抢修';
  }
  return repairStateText;
}

export function getEventRepairStateColor(event: ExtremeOcc.Event) {
  if (event.terminated) {
    return '#ffffff91';
  }
  const stateText = getEventRepairStateText(event);
  return (
    {
      无需抢修: '#ffffff80',
      未处置: '#f87171ee',
      抢修中: '#fef08aee',
      已结束: 'white',
    }[stateText] || 'white'
  );
}

export const supervisionAssociatedPoints = [
  '列车无法动车',
  '影响车站运行',
  '影响轨行区通行',
  '影响车场运行',
];

export const eventOnMapVisibilityFilter = (event: ExtremeOcc.Event) => {
  if (!!event.terminated) return false;
  if (!event.isShow) return false;
  return true;
};

export const operationOnMapVisibilityFilter = (op: ExtremeOcc.Operation) => {
  if (!op.isShow) return false;
  const curTime = Date.now();
  if (new Date(op.startTime).getTime() >= curTime) {
    return false;
  }
  // if (op.isEndTimeOptional) {
  if (op.actualEndTime) {
    return new Date(op.actualEndTime).getTime() > curTime;
  }
  // }
  return true;
  // return new Date(op.endTime).getTime() > curTime;
};
