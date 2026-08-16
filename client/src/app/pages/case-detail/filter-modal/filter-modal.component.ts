import { Component, EventEmitter, Input, Output } from '@angular/core';
import { horizontalInOutReverse } from '../../../common.animation';
import { CaseDto } from '../../../domain/case.dto';
import { ComposeOption, FilterModel } from '../case-detail.component';
import { LOCAL_CATEGORY_KEY } from '../services/utils.service';
import { FilterCategoryComponent } from './filter-category/filter-category.component';

export interface FilterCategory {
  model: ComposeOption[];
  title: string;
  key: LOCAL_CATEGORY_KEY;
}

@Component({
  selector: 'filter-modal',
  imports: [FilterCategoryComponent],
  animations: [horizontalInOutReverse],
  templateUrl: './filter-modal.component.html',
  styleUrl: './filter-modal.component.less',
})
export class FilterModalComponent {
  visible = false;

  @Input({ required: true }) filterModel!: FilterModel;
  @Input() data?: CaseDto;
  @Output() onFilterChange = new EventEmitter<{
    key: LOCAL_CATEGORY_KEY;
    option: ComposeOption;
  }>();
  @Output() onFilterBundleChange = new EventEmitter<LOCAL_CATEGORY_KEY>();
  categories: FilterCategory[] = [];
  ngOnInit() {
    this.setCategories();
  }
  setCategories() {
    this.categories = [
      {
        model: this.filterModel.lines,
        title: '线路选择',
        key: 'lines',
      },
      {
        model: this.filterModel.opEvents,
        title: '运营事件',
        key: 'opEvents',
      },
      {
        model: this.filterModel.passengerTransportMeasures,
        title: '行车措施',
        key: 'passengerTransportMeasures',
      },
      {
        model: this.filterModel.trafficMeasures,
        title: '客运措施',
        key: 'trafficMeasures',
      },
      {
        model: this.filterModel.passengerDisposals,
        title: '客运处置',
        key: 'passengerDisposals',
      },
      {
        model: this.filterModel.constructionAdjustments,
        title: '施工调整',
        key: 'constructionAdjustments',
      },
    ];
  }
  onValueChange(option: ComposeOption, key: LOCAL_CATEGORY_KEY) {
    this.onFilterChange.emit({
      option,
      key,
    });
  }
  onAllChange(key: LOCAL_CATEGORY_KEY) {
    this.onFilterBundleChange.emit(key);
  }

  toggleVisible() {
    this.visible = !this.visible;
  }
  close() {
    this.visible = false;
  }
}
