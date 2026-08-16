import {
  animate,
  state,
  style,
  transition,
  trigger,
} from '@angular/animations';
import {
  Component,
  EventEmitter,
  Input,
  Output,
  SimpleChanges,
} from '@angular/core';
import { horizontalInOutRelative } from '../../../../common.animation';
import { ActionCategory } from '../../../../domain/action.category';
import { LibraryNzModule } from '../../../../library.nz.module';
import { UtilsService } from '../../services/utils.service';
import { Message } from '../event-tabs/event-tabs.component';
import { ActionDto } from './../../../../domain/action.dto';

const fieldMap: Partial<
  Record<ActionCategory, { label: string; width: 'full' | 'half' | '1/3' }[]>
> = {
  [ActionCategory.alert]: [
    { label: '预警种类', width: 'half' },
    { label: '响应人数', width: 'half' },
    { label: '预警发布', width: 'full' },
    { label: '响应岗位', width: 'full' },
  ],
  [ActionCategory.directive]: [
    { label: '发布单位/部门', width: 'half' },
    { label: '种类', width: 'half' },
    { label: '工作指令', width: 'full' },
    { label: '工作要点', width: 'full' },
  ],
  [ActionCategory.propaganda]: [
    { label: '发布方式', width: '1/3' },
    { label: '阅读量', width: '1/3' },
    { label: '评论数', width: '1/3' },
    { label: '内容', width: 'full' },
  ],
  [ActionCategory.report]: [
    { label: '种类', width: 'full' },
    { label: '报送范围', width: 'full' },
    { label: '内容', width: 'full' },
  ],
};

type MassageGetters = (ev: ActionDto) => string;
const massageGetters: Partial<Record<ActionCategory, MassageGetters>> = {
  [ActionCategory.alert]: (ev: ActionDto) => {
    return ev.items['预警发布'];
  },
  [ActionCategory.directive]: (ev: ActionDto) => {
    return ev.items['工作指令'];
  },
  [ActionCategory.propaganda]: (ev: ActionDto) => {
    return `${ev.items['发布方式']}: ${ev.items['内容']}`;
  },
  [ActionCategory.report]: (ev: ActionDto) => {
    return `${ev.items['种类']}: ${ev.items['内容']}`;
  },
};

type Item = {
  label: string;
  value: string;
  width: 'full' | 'half' | '1/3';
};

@Component({
  selector: 'event-message-box',
  imports: [LibraryNzModule],
  templateUrl: './event-message-box.component.html',
  styleUrl: './event-message-box.component.less',
  animations: [
    horizontalInOutRelative,
    trigger('dropdown', [
      state('in', style({ transform: 'translate(0, 0%)', opacity: 1 })),
      transition('void => *', [
        style({ transform: 'translate(0, -100%)', opacity: 0 }),
        animate(200),
      ]),
      transition('* => void', [
        animate(200, style({ transform: 'translate(0, -100%)', opacity: 0 })),
      ]),
    ]),
  ],
})
export class EventMessageBoxComponent {
  @Input() data!: Message;
  message: string = '';
  // stateText: string = '发布中';
  items: Item[] = [];

  @Output() onClick = new EventEmitter<void>();

  constructor(private readonly utils: UtilsService) {}
  get stateText() {
    return this.data.expired ? '已过期' : '发布中';
  }

  ngOnChanges(changes: SimpleChanges) {
    if (changes['data']) {
      this.setMessage();
      this.setItems();
    }
  }
  setMessage() {
    const getter = massageGetters[this.data.event.category];
    if (!getter) {
      this.message = '';
    } else {
      this.message = getter(this.data.event);
    }
  }
  setItems() {
    const cate = this.data.event.category;
    const fields = fieldMap[cate];
    if (!fields) {
      this.items = [];
    } else {
      this.items = [
        {
          label: '开始时间',
          value: this.utils.formatTimeString(this.data.event.fromDate),
          width: 'half',
        },
        {
          label: '结束时间',
          value: this.utils.formatTimeString(this.data.event.toDate),
          width: 'half',
        },
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
}
