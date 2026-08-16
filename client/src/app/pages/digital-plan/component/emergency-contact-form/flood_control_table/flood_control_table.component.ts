import { CommonModule } from '@angular/common';
import { Component, Input } from '@angular/core';
import { flood_control_table } from '../emergency-contact-form.data.component';

@Component({
  selector: 'app-flood-control-table',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './flood_control_table.component.html',
  styleUrls: ['./flood_control_table.component.less'],
})
export class FloodControlTableComponent {
  @Input() selectedLine: string = '';
  @Input() selectedCompany: string = '';

  flood_control_table = flood_control_table;

  getFilteredCompanies() {
    if (!this.selectedCompany) {
      return this.flood_control_table;
    }
    const companyMap: Record<string, string> = {
      company1: '运一公司',
      company2: '运二公司',
      company3: '运三公司',
      company4: '运四公司',
      company5: '磁浮公司',
      company6: '申凯公司',
      company7: '市域公司',
      company8: '维保工务',
      company9: '维保物后',
    };

    const companyName = companyMap[this.selectedCompany];
    if (!companyName) {
      return this.flood_control_table;
    }

    return this.flood_control_table.filter(
      (company) => company.companyName === companyName,
    );
  }

  getLineGroups(locations: any[]): any[] {
    let filteredLocations = locations;
    let selectedLineName = '';

    if (this.selectedLine) {
      const lineNumber = this.selectedLine.replace('line', '');
      selectedLineName = `${lineNumber}号线`;
      // 过滤出包含所选线路的数据项
      filteredLocations = filteredLocations.filter(
        (item) =>
          item.routeLine === selectedLineName ||
          item.routeLine === `上海${selectedLineName}` ||
          item.routeLine.includes(`.${lineNumber}.`) ||
          item.routeLine.startsWith(`${lineNumber}.`) ||
          item.routeLine.endsWith(`.${lineNumber}号线`) ||
          item.routeLine === '全路网',
      );
    }

    // 当选择了线路时，所有数据项都归为一个线路组
    if (this.selectedLine) {
      const lineNumber = this.selectedLine.replace('line', '');
      selectedLineName = `${lineNumber}号线`;

      return [
        {
          routeLine: selectedLineName,
          iconPath: this.getLineIconPath(selectedLineName),
          items: filteredLocations,
        },
      ];
    } else {
      // 检查是否所有location的routeLine都是特殊值（如"全路网"或包含多个线路的组合）
      const allSpecialRouteLines = filteredLocations.every(
        (item) => item.routeLine === '全路网' || item.routeLine.includes('.'),
      );

      // 如果所有都是特殊值，将它们归为一个线路组
      if (allSpecialRouteLines && filteredLocations.length > 0) {
        return [
          {
            routeLine: '全路网',
            iconPath: '',
            items: filteredLocations,
          },
        ];
      } else {
        // 当未选择线路时，根据标准化的线路名称分组
        const lineGroups: { [key: string]: any } = {};

        filteredLocations.forEach((location) => {
          const groupKey = location.routeLine.replace('上海', '');

          if (!lineGroups[groupKey]) {
            lineGroups[groupKey] = {
              routeLine: groupKey,
              iconPath: this.getLineIconPath(location.routeLine),
              items: [],
            };
          }
          lineGroups[groupKey].items.push(location);
        });

        return Object.values(lineGroups);
      }
    }
  }

  private getLineIconPath(line: string): string {
    // 特殊线路映射
    const specialLineMap: Record<string, string> = {
      上海浦江线: 'line19',
      市域机场线: 'line22',
      全路网: 'line23',
      机场联络线: 'line20',
      上海磁浮线: 'line21',
    };

    if (specialLineMap[line]) {
      return `/assets/images/digital-plan/lineIcon/${specialLineMap[line]}.png`;
    }

    // 处理上海X号线格式
    const lineNumber = line.replace('上海', '').replace('号线', '');
    const isNumericLine = /^\d+$/.test(lineNumber);

    if (isNumericLine) {
      return `/assets/images/digital-plan/lineIcon/line${lineNumber}.png`;
    }

    // 其他线路
    return '';
  }
}
