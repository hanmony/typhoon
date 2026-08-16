import {
  animate,
  state,
  style,
  transition,
  trigger,
} from '@angular/animations';
import {
  Component,
  ElementRef,
  EventEmitter,
  Output,
  ViewChild,
} from '@angular/core';
import { horizontalInOut } from '../../../common.animation';
import { ActionCategory } from '../../../domain/action.category';
import { ActionDto } from '../../../domain/action.dto';
import { LibraryNzModule } from '../../../library.nz.module';
import { CommonEventDetailBoxComponent } from '../common-event-detail-box/common-event-detail-box.component';
import { CommonEventDetailContentComponent } from '../common-event-detail-content/common-event-detail-content.component';
import {
  constructionAdjustmentOptions,
  opEventsOptions,
  passengerDisposalOptions,
  passengerTransportMeasuresOptions,
  trafficMeasuresOptions,
} from '../selections.data';
import {
  LOCAL_EVENT_KEYS_MAP,
  categoryToLabel,
} from '../services/utils.service';
import { AutoCommonItemComponent } from './auto-common-item/auto-common-item.component';
import { AutoConstructionItemComponent } from './auto-construction-item/auto-construction-item.component';

export interface FormattedData {
  name: string;
  value: number;
  detail: ActionDto[];
}

export interface CommonEventData {
  label: string;
  value: string;
  highlight?: boolean;
}

interface IDetailPanel {
  visible: boolean;
  title: string;
  ev?: ActionDto;
}
@Component({
  selector: 'autoplay-event-pandect-modal',
  imports: [
    LibraryNzModule,
    AutoConstructionItemComponent,
    AutoCommonItemComponent,
    CommonEventDetailBoxComponent,
    CommonEventDetailContentComponent,
  ],
  templateUrl: './autoplay-event-pandect-modal.component.html',
  styleUrl: './autoplay-event-pandect-modal.component.less',
  animations: [
    horizontalInOut,
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
export class AutoplayEventPandectModalComponent {
  visible = false;
  closeable = false;
  collapsed = false;
  clickable = false;
  data: ActionDto[] = [];
  title: string = '';
  detailPanel: IDetailPanel = {
    visible: false,
    title: '',
    ev: undefined,
  };
  category: ActionCategory = ActionCategory.construction;
  formattedData: FormattedData[] = [];
  commonData: CommonEventData[] = [];
  @ViewChild('modal') modalRef?: ElementRef<HTMLDivElement>;
  timer?: NodeJS.Timeout | number | null;
  @Output() locateHandler = new EventEmitter<ActionDto>();
  @Output() accessoryHandler = new EventEmitter<ActionDto>();
  open(cate: ActionCategory, data: ActionDto[], closeable: boolean = false) {
    this.closeable = closeable;
    this.category = cate;
    this.data = data.filter((ev) => ev.category === cate);
    this.setBaseInfo();
    this.setDetailData();

    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = null;
    }
    if (this.visible) {
      this.visible = false;
    } else {
      this.visible = true;
    }
    this.timer = setTimeout(() => {
      this.visible = true;
      this.timer = null;
    }, 210);
  }
  closeImmediately() {
    this.detailPanel.visible = false;
    this.visible = false;
  }
  close() {
    // setTimeout(() => {
    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = null;
    }

    if (!this.visible) {
      this.visible = true;
    } else {
      this.visible = true;
    }
    this.timer = setTimeout(() => {
      this.visible = false;
      this.detailPanel.visible = false;
      this.timer = null;
    }, 210);

    // }, 210);
  }
  toggle() {
    this.visible = !this.visible;
  }
  toggleCollapsed() {
    this.collapsed = !this.collapsed;
  }
  setVisible(visible: boolean) {
    this.visible = visible;
  }
  setBaseInfo() {
    if (this.data.length > 0) {
      const label = categoryToLabel[this.category];
      this.title = `${label}详情`;
    } else {
      this.title = '';
    }
  }
  getLocalEventSubTypeFilter(category: ActionCategory, subType: string) {
    return (ev: ActionDto) => {
      if (ev.category !== category) {
        return false;
      }
      const items = ev['items'];
      const label = LOCAL_EVENT_KEYS_MAP.find((e) => e[1] === category)?.[2];
      if (!label) {
        return false;
      }
      return items[label] === subType;
    };
  }
  setDetailData() {
    if (this.data.length > 0) {
      switch (this.category) {
        case ActionCategory.construction:
          {
            this.formattedData = constructionAdjustmentOptions
              .map((op) => {
                const evs = this.data.filter(
                  this.getLocalEventSubTypeFilter(this.category, op.label),
                );
                return {
                  name: op.label,
                  value: evs.reduce((acc, ev) => {
                    return acc + parseInt(ev['items']['施工数量']);
                  }, 0),
                  detail: evs,
                };
              })
              .filter((op) => op.value > 0);
          }
          break;
        default: {
          this.formattedData = this.getOptions()
            .map((op) => {
              const evs = this.data.filter(
                this.getLocalEventSubTypeFilter(this.category, op.label),
              );
              return {
                name: op.label,
                value: evs.length,
                detail: evs,
              };
            })
            .filter((op) => op.value > 0);
        }
      }
    }
  }
  getOptions() {
    switch (this.category) {
      case ActionCategory.opevent: {
        return opEventsOptions;
      }
      case ActionCategory.driving: {
        return trafficMeasuresOptions;
      }
      case ActionCategory.transport: {
        return passengerTransportMeasuresOptions;
      }
      case ActionCategory.disposal: {
        return passengerDisposalOptions;
      }
      default:
        return [];
    }
  }
  handleDetail(ev: ActionDto) {
    this.detailPanel = {
      visible: true,
      title: this.getSubType(ev),
      ev: ev,
    };
  }
  handleCloseDetail() {
    this.detailPanel = {
      visible: false,
      title: '',
      ev: undefined,
    };
  }
  getSubType(ev: ActionDto) {
    const target = LOCAL_EVENT_KEYS_MAP.find(([_, key]) => key === ev.category);
    if (!target) return '';
    const typeText = target[2];
    const typeValue = ev.items[typeText];
    return typeValue || '';
  }
  handleLocate(ev: ActionDto) {
    this.locateHandler.emit(ev);
  }
  handleViewAccessories(ev: ActionDto) {
    this.accessoryHandler.emit(ev);
  }
}
