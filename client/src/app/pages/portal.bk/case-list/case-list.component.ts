import { Component, ViewContainerRef } from '@angular/core';
import { NzMessageService } from 'ng-zorro-antd/message';
import { NzModalService } from 'ng-zorro-antd/modal';
import { CaseDto } from '../../../domain/case.dto';
import { LibraryNzModule } from '../../../library.nz.module';
import { ApiService } from '../../../services/api.service';
import {
  CompareTableComponent,
  ICompareModalData,
} from './compare-table/compare-table.component';

interface CaseData extends CaseDto {
  checked: boolean;
}

interface PortalCaseSearchParams {
  search?: string;
  year?: string[];
  category?: string[];
}

const currentYear = new Date().getFullYear();

@Component({
  selector: 'portal-case-list',
  imports: [LibraryNzModule],
  templateUrl: './case-list.component.html',
  styleUrl: './case-list.component.less',
})
export class PortalCaseListComponent {
  searchText = '';
  yearOptions: string[] = Array(6)
    .fill(0)
    .map((_, i) => (currentYear - (5 - i)).toString());
  selectedYears: string[] = [];
  // compareList: string[] = [];
  focusList: string[] = [];
  list: CaseData[] = [];
  characteristicOptions: Option<string>[] = [
    { value: '范围', label: '范围较大' },
    { value: '危害', label: '危害较大' },
    // { value: '预防', label: '预防较好' },
    { value: '距离', label: '距离较近' },
    { value: '持续', label: '持续较长' },
  ];
  selectedCharacteristics: string[] = [];

  constructor(
    private modal: NzModalService,
    private message: NzMessageService,
    private apis: ApiService,
    private viewContainerRef: ViewContainerRef,
  ) {
    this.fetchCase({});
  }
  getSearchParams(): PortalCaseSearchParams {
    return {
      search: this.searchText,
      year: this.selectedYears.slice(),
      category: this.selectedCharacteristics.slice(),
    };
  }
  onSearch() {
    const params = this.getSearchParams();
    this.fetchCase(params);
  }
  fetchCase(params: PortalCaseSearchParams) {
    this.apis.library
      .getCaseList(
        params.search || '',
        params.year || [],
        params.category || [],
      )
      .then((res) => {
        this.list = res.map((item) => ({
          ...item,
          checked: false,
        }));
      });
  }
  searchTextChange(ev: Event) {
    this.searchText = (ev.target as HTMLInputElement).value;
  }
  onSearchKeyup(ev: KeyboardEvent) {
    if (ev.key === 'Enter') {
      this.onSearch();
    }
  }
  toggleYear(year: string) {
    if (this.selectedYears.includes(year)) {
      this.selectedYears = this.selectedYears.filter((y) => y !== year);
    } else {
      this.selectedYears.push(year);
    }
    this.onSearch();
  }
  toggleFocus(caseId: string) {
    if (this.focusList.includes(caseId)) {
      this.focusList = this.focusList.filter((id) => id !== caseId);
    } else {
      this.focusList.push(caseId);
    }
  }

  toggleCharacteristics(value: string) {
    if (this.selectedCharacteristics.includes(value)) {
      this.selectedCharacteristics = this.selectedCharacteristics.filter(
        (id) => id !== value,
      );
    } else {
      this.selectedCharacteristics.push(value);
    }
    this.onSearch();
  }
  allCharacteristicsClick() {
    if (this.selectedCharacteristics.length > 0) {
      this.selectedCharacteristics = [];
    }
    this.onSearch();
  }
  get allCharacteristicsChecked() {
    return this.selectedCharacteristics.length === 0;
  }
  get compareList() {
    return this.list.filter((e) => e.checked).map((e) => e._id);
  }
  isCompareBtnActive(item: CaseData) {
    if (!item.checked) return false;
    return this.compareList.length > 1;
  }
  isCompareBtnDisabled(item: CaseData) {
    if (item.checked) return false;
    return this.compareList.length === 4;
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
  compareBtnClick(item: CaseData) {
    if (!item.checked) return;
    if (this.isCompareBtnActive(item)) {
      this.createTplModal();
    }
  }
  createTplModal(): void {
    const modal = this.modal.create<CompareTableComponent, ICompareModalData>({
      nzTitle: '案例对比',
      nzContent: CompareTableComponent,
      nzViewContainerRef: this.viewContainerRef,
      nzClassName: 'compare-modal',
      nzClosable: true,
      nzData: {
        caseIds: this.compareList,
      },
      nzWidth: '90vw',
      nzFooter: null,
    });
  }
  toCaseDetail(item: CaseData) {
    window.open(`guide;id=${item._id}`);
  }
  formatExcelDate(number: number) {
    const mis = (number - 25569) * 24 * 60 * 60 * 1000;
    const d = new Date(mis);
    return (
      d.getFullYear() + '年' + (d.getMonth() + 1) + '月' + d.getDate() + '日'
    );
  }
  getCardTimeText(item: CaseData) {
    const v = item.values;
    let timeText = v['发生时间']?.value || '';
    if (!timeText) return '';
    if (!isNaN(Number(timeText))) {
      return this.formatExcelDate(Number(timeText));
    }
    return timeText;
  }
  getCardDegreeText(item: CaseData) {
    const v = item.values;
    return v['台风类型']?.value || '';
  }
  getCardHighestText(item: CaseData) {
    const v = item.values;
    return v['台风最大预警等级']?.value || '';
  }
  getFullName(item: CaseData) {
    const v = item.values;
    const enName = v['英文名称']?.value || '';
    return `${item.name} ${enName}`;
  }
}
