import { ActionCategory } from '../../domain/action.category';

export interface TableColumn {
  label: string;
  width?: number;
  truncate?: boolean;
}

const alertColumns: TableColumn[] = [
  // alert = '预警发布及响应',
  { label: '预警种类' },
  { label: '预警发布' },
  { label: '响应岗位' },
  { label: '响应人数' },
];

const directiveColumns: TableColumn[] = [
  // directive = '路网指令措施'
  { label: '发布单位/部门' },
  { label: '种类' },
  { label: '工作指令' },
  { label: '工作要点' },
];
const drivingColumns: TableColumn[] = [
  // driving = '线路行车措施'
  { label: '线路号' },
  { label: '起始车站' },
  { label: '终止车站' },
  { label: '上下行', width: 120 },
  { label: '存车线、折返线' },
  { label: '行车措施', width: 120 },
  { label: '备注', truncate: true },
];
const opeventColumns: TableColumn[] = [
  // opevent = '受台风影响运营事件'
  { label: '线路号' },
  { label: '类型' },
  { label: '车站' },
  { label: '区间起始车站' },
  { label: '区间终止车站' },
  { label: '上下行', width: 120 },
  { label: '存车线、折返线' },
  { label: '基地/控制中心' },
  { label: '事件类型', width: 120 },
  { label: '事件详情', truncate: true },
];
const constructionColumns: TableColumn[] = [
  // construction = '施工调整'
  { label: '线路' },
  { label: '施工数量' },
  { label: '调整措施', width: 120 },
];
const transportColumns: TableColumn[] = [
  // transport = '客运措施'
  { label: '线路号' },
  { label: '起始车站' },
  { label: '终止车站' },
  { label: '措施', width: 120 },
  { label: '备注', truncate: true },
];
const disposalColumns: TableColumn[] = [
  // disposal = '客运处置'
  { label: '线路号' },
  { label: '车站' },
  { label: '类型', width: 120 },
  { label: '事件详情', truncate: true },
];
const reportColumns: TableColumn[] = [
  // report = '信息报告'
  { label: '种类' },
  { label: '报送范围' },
  { label: '内容' },
];
const propagandaColumns: TableColumn[] = [
  // propaganda = '媒体宣传'
  { label: '发布方式' },
  { label: '内容' },
  { label: '阅读量' },
  { label: '评论数' },
];

export const typhoonTableMeta: {
  key: ActionCategory;
  columns: TableColumn[];
}[] = [
  { key: ActionCategory.alert, columns: alertColumns }, // '预警发布及响应',
  { key: ActionCategory.directive, columns: directiveColumns }, // '路网指令措施',
  { key: ActionCategory.driving, columns: drivingColumns }, // '线路行车措施',
  { key: ActionCategory.opevent, columns: opeventColumns }, // '受台风影响运营事件',
  { key: ActionCategory.construction, columns: constructionColumns }, // '施工调整',
  { key: ActionCategory.transport, columns: transportColumns }, // '客运措施',
  { key: ActionCategory.disposal, columns: disposalColumns }, // '客运处置',
  { key: ActionCategory.report, columns: reportColumns }, // '信息报告',
  { key: ActionCategory.propaganda, columns: propagandaColumns }, // '媒体宣传',
];
