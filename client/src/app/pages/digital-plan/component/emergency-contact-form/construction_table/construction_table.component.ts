import { CommonModule } from '@angular/common';
import {
  Component,
  Input,
  OnChanges,
  OnInit,
  SimpleChanges,
} from '@angular/core';
import { construction_table } from '../emergency-contact-form.data.component';

interface GroupedConstruction {
  line: string;
  iconPath: string;
  items: typeof construction_table;
}

@Component({
  selector: 'app-construction-table',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './construction_table.component.html',
  styleUrls: ['./construction_table.component.less'],
})
export class ConstructionTableComponent implements OnInit, OnChanges {
  ngOnChanges(changes: SimpleChanges): void {
    throw new Error('Method not implemented.');
  }
  @Input() selectedLine: string = '';
  @Input() selectedCompany: string = '';

  groupedData: GroupedConstruction[] = [];

  ngOnInit(): void {
    this.groupDataByLine();
  }

  private groupDataByLine(): void {
    // Filter
    let filteredData = construction_table;

    if (this.selectedLine) {
      const lineNumber = this.selectedLine.replace('line', '');
      const lineName = `${lineNumber}号线`;
      filteredData = filteredData.filter((item) => item.line === lineName);
    }

    const grouped = filteredData.reduce(
      (acc, item) => {
        if (!acc[item.line]) {
          acc[item.line] = [];
        }
        acc[item.line].push(item);
        return acc;
      },
      {} as Record<string, typeof construction_table>,
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
}
