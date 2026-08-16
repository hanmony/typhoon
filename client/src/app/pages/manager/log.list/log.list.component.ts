import { Component, OnInit } from '@angular/core';
import { NzSafeAny } from 'ng-zorro-antd/core/types';
import { NzTableFilterList, NzTableQueryParams } from 'ng-zorro-antd/table';
import { CommonNzModule } from '../../../common.nz.module';
import { LogDto } from '../../../domain/log.dto';
import { LogListReqDto } from '../../../domain/log.list.req.dto';
import { ApiService } from '../../../services/api.service';
import { StorageService } from '../../../services/storage.service';
import { TableStringFilterComponent } from '../../common/table.string.filter/table.string.filter.component';

@Component({
  selector: 'app-log.list',
  imports: [CommonNzModule, TableStringFilterComponent],
  templateUrl: './log.list.component.html',
  styleUrl: './log.list.component.less',
})
export class LogListComponent implements OnInit {
  constructor(
    private readonly api: ApiService,
    private readonly storage: StorageService,
  ) {}

  roles: NzTableFilterList = [];
  subjects: NzTableFilterList = [];
  teams: NzTableFilterList = [];
  departments: NzTableFilterList = [];
  lines: NzTableFilterList = [];

  pending = false;
  queryPeriod: string = ''; // 查询时间段
  detailVisible = false;
  currentDetailId = '';
  logs: LogDto[] = [];
  totalLogs = 0;
  searchArgs: LogListReqDto = new LogListReqDto();

  async ngOnInit(): Promise<void> {}

  async onPeriodChange(result: Date[]) {
    if (this.queryPeriod && this.queryPeriod.length > 0) {
      this.searchArgs.period‌ = [];
      this.searchArgs.period‌[0] = this.getDate(result[0]);
      this.searchArgs.period‌[1] = this.getDate(result[1], false);
    } else {
      this.searchArgs.period‌ = undefined;
    }
    await this.refresh();
  }

  getDate(date: Date, isStart: boolean = true) {
    //返回年月日，月和日补足两位数
    let year = date.getFullYear();
    let month = date.getMonth() + 1;
    let day = date.getDate();
    //补足月和日的双位数
    let monthStr = month > 9 ? month.toString() : '0' + month;
    let dayStr = day > 9 ? day.toString() : '0' + day;
    //拼接
    if (isStart) {
      return new Date(year + '-' + monthStr + '-' + dayStr);
    }
    return new Date(year + '-' + monthStr + '-' + dayStr + ' ' + '23:59:59');
  }

  async onQueryParamsChange(params: NzTableQueryParams) {
    const { pageSize, pageIndex, sort, filter } = params;
    this.searchArgs = new LogListReqDto();
    this.searchArgs.page = pageIndex;
    this.searchArgs.pageSize = pageSize;
    this.searchArgs.period‌ = undefined;
    const currentSort = sort.find((item) => item.value !== null);
    if (currentSort) {
      this.searchArgs.sortPath = currentSort.key;
      this.searchArgs.sortType = currentSort.value == 'ascend' ? 'asc' : 'desc';
    }
    for (const f of filter) {
      (this.searchArgs as NzSafeAny)[f.key] = f.value || undefined;
    }
    await this.refresh();
  }

  get httpHeaders() {
    const token = this.storage.token || '';
    return { authorization: `Bearer ${token}` };
  }

  async refresh() {
    this.pending = true;
    await this.api.log
      .getList(this.searchArgs)
      .then((ret) => {
        this.logs = ret.list;
        this.totalLogs = ret.total;
      })
      .finally(() => (this.pending = false));
  }
}
