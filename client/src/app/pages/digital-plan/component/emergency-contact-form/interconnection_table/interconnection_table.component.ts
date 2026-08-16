import { CommonModule } from '@angular/common';
import {
  Component,
  Input,
  OnChanges,
  OnInit,
  SimpleChanges,
} from '@angular/core';
import { interconnection_table } from '../emergency-contact-form.data.component';

interface RichText {
  richText: {
    font: {
      size: number;
      color: {
        theme: number;
      };
      name: string;
      charset: number;
      scheme: string;
    };
    text: string;
  }[];
}

interface StationData {
  station: string | RichText;
  locations: string[];
  connectionStatuses: string[];
  companies: string[];
  stationContacts: string[];
  mallContacts: string[];
}

interface GroupedByLine {
  line: string;
  iconPath: string;
  stations: StationData[];
}

@Component({
  selector: 'app-interconnection-table',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './interconnection_table.component.html',
  styleUrls: ['./interconnection_table.component.less'],
})
export class InterconnectionTableComponent implements OnInit, OnChanges {
  ngOnChanges(changes: SimpleChanges): void {
    throw new Error('Method not implemented.');
  }
  @Input() selectedLine: string = '';
  @Input() selectedCompany: string = '';

  groupedData: GroupedByLine[] = [];

  ngOnInit(): void {
    this.groupDataByLine();
  }

  private groupDataByLine(): void {
    let filteredData = interconnection_table;

    if (this.selectedLine) {
      const lineNumber = this.selectedLine.replace('line', '');
      const lineName = `${lineNumber}号线`;
      filteredData = filteredData.filter((item) => item.line === lineName);
    }
    const groupedByLine = filteredData.reduce(
      (acc, item) => {
        if (!acc[item.line]) {
          acc[item.line] = [];
        }
        acc[item.line].push(item);
        return acc;
      },
      {} as Record<string, typeof interconnection_table>,
    );

    // 对每个线路，按车站分组
    this.groupedData = Object.entries(groupedByLine).map(
      ([line, items], index) => {
        const groupedByStation = items.reduce(
          (acc, item) => {
            const stationKey =
              typeof item.station === 'string'
                ? item.station
                : this.getRichTextContent(item.station);
            if (!acc[stationKey]) {
              acc[stationKey] = {
                station: item.station,
                locations: [],
                connectionStatuses: [],
                companies: [],
                stationContacts: [],
                mallContacts: [],
              };
            }
            acc[stationKey].locations.push(item.location);
            acc[stationKey].connectionStatuses.push(item.connectionStatus);
            acc[stationKey].companies.push(
              this.filterCompanyName(item.company),
            );
            acc[stationKey].stationContacts.push(
              `${item.stationFloodControlContact}/${item.stationContactInfo}`,
            );
            acc[stationKey].mallContacts.push(
              `${item['商场防汛联系人']}/${item.mallContactInfo}`,
            );
            return acc;
          },
          {} as Record<string, StationData>,
        );

        // 生成线路图标路径
        let iconPath = '';
        const lineNumber = line.replace('号线', '');
        const isNumericLine = /^\d+$/.test(lineNumber);

        if (isNumericLine) {
          iconPath = `/assets/images/digital-plan/lineIcon/line${lineNumber}.png`;
        } else if (line === '浦江线') {
          iconPath = `/assets/images/digital-plan/lineIcon/line19.png`;
        } else if (line === '市域机场线') {
          iconPath = `/assets/images/digital-plan/lineIcon/line20.png`;
        }

        return {
          line,
          iconPath,
          stations: Object.values(groupedByStation),
        };
      },
    );
  }

  private getRichTextContent(richText: RichText): string {
    return richText.richText?.map((item) => item.text).join('') || '';
  }

  private filterCompanyName(company: string): string {
    return company.replace('公司', '').trim();
  }

  public getStationDisplay(station: string | RichText): string {
    return typeof station === 'string'
      ? station
      : this.getRichTextContent(station);
  }
}
