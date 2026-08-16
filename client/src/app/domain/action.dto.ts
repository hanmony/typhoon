import { ActionAccessoryDto } from './action.accessory.dto';
import { ActionCategory } from './action.category';

export class ActionDto {
  _id: string = '';
  // 案例ID
  // @Prop({ index: true, type: Types.ObjectId })
  caseId: string = '';
  // 案例名称
  // @Prop({ index: true, type: String })
  caseName: string = '';
  // 行为种类
  // @Prop({ index: true, type: String })
  category: ActionCategory = ActionCategory.unknown;
  // 开始时间
  // @Prop({ type: Date })
  fromDate = new Date();
  // 结束时间，如果大于3000年，表示无结束时间
  // @Prop({ type: Date })
  toDate = new Date();
  // 行为实施主体
  // @Prop({ type: String })
  source: string = '';
  // 行为内容
  // @Prop({ type: String })
  content: string = '';
  // 行为详细描述
  // @Prop({ type: String })
  description: string = '';
  // 行为数据
  // @Prop({ type: Types.Map, of: String })
  items: Record<string, string> = {};

  accessories: ActionAccessoryDto[] = [];
}
