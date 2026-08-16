import { Component } from '@angular/core';
import { CaseDto } from '../../../domain/case.dto';
import { LibraryNzModule } from '../../../library.nz.module';
import { ApiService } from './../../../services/api.service';

interface YearTimelineItem {
  year: number;
  items: {
    position: 'left' | 'right';
    data: CaseDto;
  }[];
}

@Component({
  selector: 'year-timeline',
  imports: [LibraryNzModule],
  templateUrl: './year-timeline.component.html',
  styleUrl: './year-timeline.component.less',
})
export class YearTimelineComponent {
  list: YearTimelineItem[] = [];
  constructor(private readonly apis: ApiService) {}
  ngOnInit() {
    this.fetchCases();
  }
  fetchCases() {
    this.apis.library.getCaseList('', [], []).then((res) => {
      const sortedCases = res.sort((a, b) => {
        const aDate = this.getDate(a);
        const bDate = this.getDate(b);
        return bDate.getTime() - aDate.getTime();
      });
      let count = 0;
      this.list = sortedCases
        .reduce((acc, cur) => {
          const year = this.getDate(cur).getFullYear();
          const index = acc.findIndex((item) => item.year === Number(year));
          const data: { position: 'left' | 'right'; data: CaseDto } = {
            position: count % 2 === 0 ? 'left' : 'right',
            data: cur,
          };
          if (index === -1) {
            acc.push({
              year: Number(year),
              items: [data],
            });
          } else {
            acc[index].items.push(data);
          }
          count++;
          return acc;
        }, [] as YearTimelineItem[])
        .sort((a, b) => b.year - a.year);
    });
  }
  onChange(value: number) {}
  toCaseDetail(item: CaseDto) {
    window.open(`guide;id=${item._id}`);
  }
  getValue(item?: CaseDto, key?: string) {
    if (!item || !key) {
      return '';
    }
    const value = item.values[key];
    if (value) {
      return value.value || '';
    } else {
      return '';
    }
  }
  formatExcelDate(number: number) {
    const mis = (number - 25569) * 24 * 60 * 60 * 1000;
    const d = new Date(mis);
    return (
      d.getFullYear() + '年' + (d.getMonth() + 1) + '月' + d.getDate() + '日'
    );
  }
  getTimeText(item?: CaseDto) {
    return this.getValue(item, '发生时间') || '';
  }
  getDate(item: CaseDto) {
    const regexp = /^(\d+)年(\d+)月(\d+)日$/;
    const dateString =
      this.getTimeText(item).match(regexp)?.slice(1, 4).join('-') || '';
    return new Date(dateString);
  }
  getWeatherAlertText(item: CaseDto) {
    return this.getValue(item, '台风最大预警等级');
  }
  getWeatherAlertColorByText(item: CaseDto): string {
    const message = this.getWeatherAlertText(item);
    if (message.indexOf('蓝色') !== -1) {
      return 'blue';
    } else if (message.indexOf('黄色') !== -1) {
      return 'yellow';
    } else if (message.indexOf('橙色') !== -1) {
      return 'orange';
    } else if (message.indexOf('台风红色') !== -1) {
      return 'red';
    } else if (message.indexOf('逐级解除') !== -1) {
      return 'lift';
    } else {
      return 'unknown';
    }
  }
}
