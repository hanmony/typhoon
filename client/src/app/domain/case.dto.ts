import { ActionDto } from './action.dto';
import { PathInfoDto } from './path.info.dto';

export enum CaseConfigKeys {
  台风命名 = '台风命名',
  台风年度 = '台风年度',
  台风类型 = '台风类型',
  台风生成时间 = '台风生成时间',
  预警发布时间 = '预警发布时间',
  最高预警时间 = '最高预警时间',
  预警解除时间 = '预警解除时间',
  台风消散时间 = '台风消散时间',
  影响上海时长 = '影响上海时长',
  台风最大风力 = '台风最大风力',
  台风最大预警等级 = '台风最大预警等级',
  共计发布预警指令 = '共计发布预警指令',
  停运线路数 = '停运线路数',
  安全运营调整数 = '安全运营调整数',
  设备设施保护抢修 = '设备设施保护抢修',
  热线接听总量 = '热线接听总量',
  人工接听总量 = '人工接听总量',
  台风相关咨询建议 = '台风相关咨询建议',
  舆情概况 = '舆情概况',
  特殊展示归类 = '特殊展示归类',
}

export enum CaseStatus {
  deleted = -1, // 删除
  normal = 0, // 正常
  approving = 1, // 待发布
  editing = 2, // 编辑中
}

export class CaseConfigItem {
  // @ApiProperty({ description: "配置项名称" })
  key: string = '';
  // @ApiProperty({ description: "配置项类别" })
  type: string = '';
  // @ApiProperty({ description: "配置项值" })
  value: string = '';

  editorType?: string = '';
  editorOptions: string[] = [];
}

export class CaseDto {
  _id: string = '';
  // 显示名字
  // @ApiProperty({ description: '案例名称' })
  name: string = '';

  // @ApiProperty({ description: '台风案例配置值', type: [CaseConfigItem] })
  values: Record<string, CaseConfigItem> = {};

  // 状态, 0: 正常, 1: 下架, 2: 编辑中, -1: 删除
  // @ApiProperty({ description: '状态', enum: CaseStatus })
  status = CaseStatus.normal;

  // @ApiProperty({ description: '创建时间' })
  createdAt: string = '';
  // @ApiProperty({ description: '更新时间' })
  updatedAt: string = '';

  __v = 0;
}

export class CaseDetailDto {
  // @ApiProperty({ description: '案例基本信息' })
  doc: CaseDto = new CaseDto();

  // @ApiProperty({ description: '台风事件详情' })
  eventsMap: Map<string, ActionDto[]> = new Map();

  // @ApiProperty({ description: '台风路径信息' })
  pathInfo: PathInfoDto[] = [];
}
