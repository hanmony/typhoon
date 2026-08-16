import { Component } from '@angular/core';
import { CaseDto } from '../../../domain/case.dto';
import { LibraryNzModule } from '../../../library.nz.module';
import { ApiService } from '../../../services/api.service';

type CategoryType = 'range' | 'damage' | 'distance' | 'duration';

interface Category {
  type: CategoryType;
  name: string;
  searchKey: string;
  list: CaseDto[];
}

const categories: Category[] = [
  {
    type: 'range',
    name: '范围较大台风案例',
    searchKey: '范围',
    list: [],
  },
  {
    type: 'damage',
    name: '危害较大台风案例',
    searchKey: '危害',
    list: [],
  },
  // {
  //   type: 'prevent',
  //   name: '预防较好台风案例',
  //   searchKey: '预防',
  //   list: [],
  // },
  {
    type: 'distance',
    name: '距上海较近台风案例',
    searchKey: '距离',
    list: [],
  },
  {
    type: 'duration',
    name: '持续时间较长台风案例',
    searchKey: '时间',
    list: [],
  },
];

@Component({
  selector: 'portal-discover',
  imports: [LibraryNzModule],
  templateUrl: './discover.component.html',
  styleUrl: './discover.component.less',
})
export class PortalDiscoverComponent {
  activeCategoryType: CategoryType = 'range';
  categories = categories;

  constructor(private readonly apis: ApiService) {
    this.apis.library.getCasesMapByCategory().then((res) => {
      Object.entries(res).forEach(([k, v]) => {
        const cate = this.categories.find((c) => k.indexOf(c.searchKey) !== -1);
        if (cate) {
          // cate.list = [...v, ...v, ...v, ...v];
          cate.list = [...cate.list, ...v];
        }
      });
    });
  }
  ngAfterViewInit(): void {}
  onCategoryChange(category: CategoryType): void {
    this.activeCategoryType = category;
  }
  get list() {
    return categories.find((item) => item.type === this.activeCategoryType)
      ?.list;
  }
  getDescription(item: CaseDto) {
    const values = item.values;
    const effectText = values['影响线路']?.value || '';
    return `影响线路：${effectText}`;
  }
  toCaseDetail(item: CaseDto) {
    window.open(`guide;id=${item._id}`);
  }
  getFullName(item: CaseDto) {
    const v = item.values;
    const enName = v['英文名称']?.value || '';
    return `${item.name} ${enName}`;
  }
}
