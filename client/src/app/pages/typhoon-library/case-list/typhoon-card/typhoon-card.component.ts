import { Component, EventEmitter, Input, Output } from '@angular/core';
import { NzMessageService } from 'ng-zorro-antd/message';
import { CaseDto } from '../../../../domain/case.dto';
import { LibraryNzModule } from '../../../../library.nz.module';
import { ShortcutComponent } from './shortcut/shortcut.component';

export interface CaseData extends CaseDto {
  checked: boolean;
}

@Component({
  selector: 'typhoon-card',
  imports: [LibraryNzModule, ShortcutComponent],
  templateUrl: './typhoon-card.component.html',
  styleUrl: './typhoon-card.component.less',
})
export class TyphoonCardComponent {
  @Input() data!: CaseData;
  @Input() index!: number;
  @Input() compareList: string[] = [];
  @Output() openModal = new EventEmitter();
  constructor(private message: NzMessageService) {}

  formatExcelDate(number: number) {
    const mis = (number - 25569) * 24 * 60 * 60 * 1000;
    const d = new Date(mis);
    return (
      d.getFullYear() + '年' + (d.getMonth() + 1) + '月' + d.getDate() + '日'
    );
  }
  getCardTimeText(item: CaseDto) {
    const v = item.values;
    let timeText = v['发生时间']?.value || '';
    if (!timeText) return '';
    if (!isNaN(Number(timeText))) {
      return this.formatExcelDate(Number(timeText));
    }
    return timeText;
  }
  checkHandler(item: CaseData) {
    if (item.checked) {
      if (this.compareList.length > 4) {
        item.checked = false;
        this.message.error('对比数量不超过4个');
        setTimeout(() => {
          item.checked = false;
        });
      }
    }
  }
  isCompareBtnDisabled(item: CaseData) {
    if (item.checked) return false;
    return this.compareList.length === 4;
  }
  toCaseDetail(item: CaseData) {
    window.open(`guide;id=${item._id}`);
  }
  compareBtnClick(item: CaseData) {
    if (!item.checked) return;
    if (this.isCompareBtnActive(item)) {
      this.openModal.emit();
    }
  }
  isCompareBtnActive(item: CaseData) {
    if (!item.checked) return false;
    return this.compareList.length > 1;
  }
  getCardDegreeText(item: CaseDto) {
    const v = item.values;
    return v['台风类型']?.value || '';
  }
  getCardHighestText(item: CaseDto) {
    const v = item.values;
    return v['台风最大预警等级']?.value || '';
  }
  getFullName(item: CaseDto) {
    const v = item.values;
    const enName = v['英文名称']?.value || '';
    return `${item.name} ${enName}`;
  }
  getNumber(item: CaseDto) {
    const v = item.values;
    // const year = v['台风年度']?.value || '';
    const no = v['台风编号']?.value || '';
    return `${no}`;
  }
}
