import {
  Component,
  TemplateRef,
  ViewChild,
  ViewContainerRef,
} from '@angular/core';
import { NzModalService } from 'ng-zorro-antd/modal';
import { LibraryNzModule } from '../../../library.nz.module';
import { ApiService } from '../../../services/api.service';
import { GuideMapService } from '../../guide/guide-map.service';
import {
  CompareTableComponent,
  ICompareModalData,
} from './compare-table/compare-table.component';
import { SelectActionComponent } from './select-action/select-action.component';
import {
  CaseData,
  TyphoonCardComponent,
} from './typhoon-card/typhoon-card.component';

const currentYear = new Date().getFullYear();

@Component({
  selector: 'typhoon-library-case-list',
  imports: [LibraryNzModule, SelectActionComponent, TyphoonCardComponent],
  templateUrl: './case-list.component.html',
  styleUrl: './case-list.component.less',
})
export class DarkPortalCaseListComponent {
  @ViewChild('closeIcon') closeIcon!: TemplateRef<void>;

  yearOptions: Option<string>[] = [
    { value: '', label: '全部' },
    ...Array(6)
      .fill(0)
      .map((_, i) => (currentYear - (5 - i)).toString())
      .map((y) => ({ value: y, label: y })),
  ];
  orderOptions: Option<string>[] = [
    { value: '', label: '无' },
    { value: 'direction', label: '台风走向' },
    { value: 'degree', label: '台风等级' },
    { value: 'alert', label: '预警等级' },
  ];
  params = {
    year: '',
    order: '',
  };
  focusList: string[] = [];
  get compareList() {
    return this.list.filter((e) => e.checked).map((e) => e._id);
  }
  list: CaseData[] = [];
  constructor(
    private readonly apis: ApiService,
    private modal: NzModalService,
    private mapService: GuideMapService,
    private viewContainerRef: ViewContainerRef,
  ) {
    // this.getCaseList();
    this.mapService.getProvincialRegions();
  }
  async ngAfterViewInit() {
    this.getCaseList();
  }
  onYearFilterChange(year: string) {
    this.params.year = year;
    this.getCaseList();
  }
  onOrderChange(order: string) {
    this.params.order = order;
    this.getCaseList();
  }
  getCaseList() {
    const { year, order } = this.params;
    this.list = [];
    this.apis.library.getCases(year || '', order || '').then((res) => {
      this.list = res.map((item) => ({
        ...item,
        checked: false,
      }));
    });
  }

  createTplModal(): void {
    const modal = this.modal.create<CompareTableComponent, ICompareModalData>({
      nzContent: CompareTableComponent,
      nzViewContainerRef: this.viewContainerRef,
      nzClassName: 'compare-modal',
      nzClosable: true,
      nzCloseIcon: this.closeIcon,
      nzData: {
        caseIds: this.compareList,
      },
      nzWidth: '90vw',
      nzFooter: null,
    });
  }
}
