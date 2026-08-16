import { Component, ElementRef, ViewChild } from '@angular/core';
import { Subscription, fromEvent } from 'rxjs';
import { horizontalInOut } from '../../../../common.animation';
import { ActionCategory } from '../../../../domain/action.category';
import { ActionDto } from '../../../../domain/action.dto';
import { CommonEventDetailBoxComponent } from '../../common-event-detail-box/common-event-detail-box.component';
import { CommonEventDetailContentComponent } from '../../common-event-detail-content/common-event-detail-content.component';
import { constructionAdjustmentOptions } from '../../selections.data';
import {
  UtilsService,
  mapEffectActionCategory,
} from '../../services/utils.service';
import { ConstructionItemComponent } from './construction-item/construction-item.component';

export interface ConstructionAdjustmentData {
  name: string;
  value: number;
  detail: ActionDto[];
}

@Component({
  selector: 'common-event-modal',
  imports: [
    ConstructionItemComponent,
    CommonEventDetailBoxComponent,
    CommonEventDetailContentComponent,
  ],
  animations: [horizontalInOut],
  templateUrl: './common-event-modal.component.html',
  styleUrl: './common-event-modal.component.less',
})
export class CommonEventModalComponent {
  visible = false;
  data: ActionDto[] = [];
  title: string = '';
  category: ActionCategory = ActionCategory.construction;
  constructionAdjustmentData: ConstructionAdjustmentData[] = [];
  commonData?: ActionDto;

  $subscription?: Subscription;
  @ViewChild('modal') modalRef?: ElementRef<HTMLDivElement>;
  constructor(private readonly utils: UtilsService) {}
  open(cate: ActionCategory, data: ActionDto[]) {
    this.category = cate;
    this.data = data;
    this.visible = true;
    this.setBaseInfo();
    this.setDetailData();
    cate !== ActionCategory.construction && this.addListener();
  }
  close() {
    this.visible = false;
    this.removeListener();
  }
  addListener() {
    this.$subscription = fromEvent(window, 'click', {
      capture: true,
    }).subscribe((ev) => {
      const modal = this.modalRef?.nativeElement;
      if (modal) {
        if (!modal.contains(ev.target as Node)) {
          this.visible = false;
          this.removeListener();
        }
      }
    });
  }
  removeListener() {
    if (this.$subscription) {
      this.$subscription.unsubscribe();
      this.$subscription = undefined;
    }
  }
  toggle() {
    this.visible = !this.visible;
  }

  setConstructionVisible(visible: boolean) {
    this.visible = visible;
    if (visible) {
      this.category = ActionCategory.construction;
      this.setBaseInfo();
    }
  }
  setBaseInfo() {
    if (this.data.length > 0) {
      const label = mapEffectActionCategory[this.category];
      this.title = `${label}详情`;
    } else {
      this.title = '';
    }
  }
  setDetailData() {
    if (this.data.length > 0) {
      if (this.category === ActionCategory.construction) {
        this.constructionAdjustmentData = constructionAdjustmentOptions
          .map((op) => {
            const evs = this.data.filter((ev) => {
              if (ev.category !== ActionCategory.construction) return false;
              const items = ev['items'];
              return items['调整措施'] === op.label;
            });
            return {
              name: op.label,
              value: evs.reduce((acc, ev) => {
                return acc + parseInt(ev['items']['施工数量']);
              }, 0),
              detail: evs,
            };
          })
          .filter((op) => op.value > 0);
      } else {
        this.commonData = this.data[0];
      }
    }
  }
}
