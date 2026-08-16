import { CommonModule } from '@angular/common';
import {
  Component,
  Input,
  OnChanges,
  OnInit,
  SimpleChanges,
} from '@angular/core';
import { cave_entrance_table } from '../emergency-contact-form.data.component';

interface Contact {
  department: string;
  name: string;
  phone: string;
}

interface GroupedCaveEntrances {
  line: string;
  iconPath: string;
  items: ((typeof cave_entrance_table)[0] & {
    maintenanceContacts: Contact[];
  })[];
}

@Component({
  selector: 'app-cave-entrance-table',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './cave_entrance_table.component.html',
  styleUrls: ['./cave_entrance_table.component.less'],
})
export class CaveEntranceTableComponent implements OnInit, OnChanges {
  @Input() selectedLine: string = '';
  @Input() selectedCompany: string = '';

  groupedData: GroupedCaveEntrances[] = [];

  ngOnInit(): void {
    this.groupDataByLine();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['selectedLine'] || changes['selectedCompany']) {
      this.groupDataByLine();
    }
  }

  private groupDataByLine(): void {
    // Filter data based on selected filters
    let filteredData = cave_entrance_table;

    if (this.selectedLine) {
      // Convert selectedLine (e.g., line1) to line name (e.g., 1号线)
      const lineNumber = this.selectedLine.replace('line', '');
      const lineName = `${lineNumber}号线`;
      filteredData = filteredData.filter((item) => item.line === lineName);
    }

    const grouped = filteredData.reduce(
      (acc, item) => {
        if (!acc[item.line]) {
          acc[item.line] = [];
        }
        acc[item.line].push({
          ...item,
          maintenanceContacts: this.parseMaintenanceInfo(item.maintenanceInfo),
        });
        return acc;
      },
      {} as Record<
        string,
        ((typeof cave_entrance_table)[0] & { maintenanceContacts: Contact[] })[]
      >,
    );

    // 特殊线路映射
    const specialLineMap: Record<string, string> = {
      浦江线: 'line19',
      市域机场线: 'line20',
    };

    this.groupedData = Object.entries(grouped).map(([line, items]) => {
      if (specialLineMap[line]) {
        return {
          line,
          iconPath: `/assets/images/digital-plan/lineIcon/${specialLineMap[line]}.png`,
          items,
        };
      }

      const lineNumber = line.replace('号线', '');
      const isNumericLine = /^\d+$/.test(lineNumber);

      if (isNumericLine) {
        return {
          line,
          iconPath: `/assets/images/digital-plan/lineIcon/line${lineNumber}.png`,
          items,
        };
      }

      // 其他线路
      return {
        line,
        iconPath: '',
        items,
      };
    });
  }

  private parseMaintenanceInfo(maintenanceInfo: string): Contact[] {
    return maintenanceInfo.split('\n').map((contactStr) => {
      const parts = contactStr.split('/');
      return {
        department: parts[0] || '',
        name: parts[1] || '',
        phone: parts[2] || '',
      };
    });
  }
}
