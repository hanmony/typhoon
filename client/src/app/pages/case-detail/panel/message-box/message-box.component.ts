import {
  Component,
  EventEmitter,
  Input,
  Output,
  SimpleChanges,
} from '@angular/core';
import { horizontalInOutRelative } from '../../../../common.animation';
import { ActionCategory } from '../../../../domain/action.category';
import { ActionDto } from '../../../../domain/action.dto';
import { LibraryNzModule } from '../../../../library.nz.module';
import { UtilsService } from '../../services/utils.service';
import { Message } from '../event-tabs/event-tabs.component';

const fieldMap: Partial<
  Record<ActionCategory, { label: string; width: 'full' | 'half' | '1/3' }[]>
> = {
  [ActionCategory.alert]: [
    // { label: '预警种类', width: 'half' },
    // { label: '响应人数', width: 'half' },
    { label: '预警发布', width: 'full' },
    { label: '响应岗位', width: 'full' },
  ],
  [ActionCategory.directive]: [
    { label: '发布单位/部门', width: 'full' },
    // { label: '种类', width: 'half' },
    { label: '工作指令', width: 'full' },
    { label: '工作要点', width: 'full' },
  ],
  [ActionCategory.propaganda]: [
    // { label: '发布方式', width: '1/3' },
    { label: '阅读量', width: 'half' },
    { label: '评论数', width: 'half' },
    { label: '内容', width: 'full' },
  ],
  [ActionCategory.report]: [
    // { label: '种类', width: 'full' },
    { label: '报送范围', width: 'full' },
    { label: '内容', width: 'full' },
  ],
};

type MassageGetters = (ev: ActionDto) => string;
const massageGetters: Partial<Record<ActionCategory, MassageGetters>> = {
  [ActionCategory.alert]: (ev: ActionDto) => {
    return ev.items['预警种类'];
  },
  [ActionCategory.directive]: (ev: ActionDto) => {
    return ev.items['种类'];
  },
  [ActionCategory.propaganda]: (ev: ActionDto) => {
    return `${ev.items['发布方式']}`;
  },
  [ActionCategory.report]: (ev: ActionDto) => {
    return `${ev.items['种类']}`;
  },
};

type Item = {
  label: string;
  value: string;
  width: 'full' | 'half' | '1/3';
};

@Component({
  selector: 'message-box',
  imports: [LibraryNzModule],
  templateUrl: './message-box.component.html',
  styleUrl: './message-box.component.less',
  animations: [horizontalInOutRelative],
})
export class MessageBoxComponent {
  @Input() data!: Message;
  title: string = '';
  items: Item[] = [];

  @Output() onClick = new EventEmitter<void>();

  constructor(private readonly utils: UtilsService) {}
  get stateText() {
    return this.data.expired ? '已过期' : '发布中';
  }

  ngOnChanges(changes: SimpleChanges) {
    if (changes['data']) {
      this.setTitle();
      this.setItems();
    }
  }
  setTitle() {
    const getter = massageGetters[this.data.event.category];
    if (!getter) {
      this.title = '';
    } else {
      this.title = getter(this.data.event);
    }
  }
  setItems() {
    const cate = this.data.event.category;
    const fields = fieldMap[cate];
    if (!fields) {
      this.items = [];
    } else {
      this.items = [
        // {
        //   label: '开始时间',
        //   value: this.utils.formatTimeString(this.data.event.fromDate),
        //   width: 'half',
        // },
        // {
        //   label: '结束时间',
        //   value: this.utils.formatTimeString(this.data.event.toDate),
        //   width: 'half',
        // },
        ...fields.map((f) => {
          return {
            label: f.label,
            value: this.data.event.items[f.label] || '@@##',
            width: f.width,
          };
        }),
      ];
    }
  }
  handleClick() {
    this.onClick.emit();
  }
  get time() {
    return (
      this.utils.formatTimeString(this.data.event.fromDate).slice(5) +
      ' - ' +
      this.utils.formatTimeString(this.data.event.toDate).slice(5)
    );
  }
}
