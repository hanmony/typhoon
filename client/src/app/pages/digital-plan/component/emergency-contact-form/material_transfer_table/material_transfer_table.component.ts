import { CommonModule } from '@angular/common';
import { Component, Input } from '@angular/core';
import { materialTransferByCompany } from '../emergency-contact-form.data.component';

@Component({
  selector: 'app-material-transfer-table',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './material_transfer_table.component.html',
  styleUrls: ['./material_transfer_table.component.less'],
})
export class MaterialTransferTableComponent {
  @Input() selectedLine: string = '';
  @Input() selectedCompany: string = '';

  materialTransferByCompany = materialTransferByCompany;

  getFilteredCompanies() {
    if (!this.selectedCompany) {
      return this.materialTransferByCompany;
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
      return this.materialTransferByCompany;
    }

    return this.materialTransferByCompany.filter(
      (company) => company.companyName === companyName,
    );
  }

  getLineGroups(locations: any[]): any[] {
    let filteredLocations = locations;

    if (this.selectedLine) {
      const lineNumber = this.selectedLine.replace('line', '');
      const lineName = `${lineNumber}号线`;
      filteredLocations = filteredLocations.filter(
        (item) => item.routeLine === lineName,
      );
    }

    const lineGroups: { [key: string]: any } = {};

    filteredLocations.forEach((location) => {
      if (!lineGroups[location.routeLine]) {
        lineGroups[location.routeLine] = {
          routeLine: location.routeLine,
          iconPath: this.getLineIconPath(location.routeLine),
          items: [],
        };
      }
      lineGroups[location.routeLine].items.push(location);
    });

    return Object.values(lineGroups);
  }

  private getLineIconPath(line: string): string {
    // 特殊线路映射
    const specialLineMap: Record<string, string> = {
      浦江线: 'line19',
      市域机场线: 'line20',
    };

    if (specialLineMap[line]) {
      return `/assets/images/digital-plan/lineIcon/${specialLineMap[line]}.png`;
    }

    const lineNumber = line.replace('号线', '');
    const isNumericLine = /^\d+$/.test(lineNumber);

    if (isNumericLine) {
      return `/assets/images/digital-plan/lineIcon/line${lineNumber}.png`;
    }

    // 其他线路
    return '';
  }
}
