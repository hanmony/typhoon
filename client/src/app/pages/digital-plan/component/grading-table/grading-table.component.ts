import { CommonModule } from '@angular/common';
import { Component, HostListener } from '@angular/core';
import { grading_table } from '../../digital-plan.data.component';

@Component({
  selector: 'app-grading-table',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './grading-table.component.html',
  styleUrls: ['./grading-table.component.less'],
})
export class GradingTableComponent {
  // 线路列表
  lines: string[] = Array.from(new Set(grading_table.map((item) => item.line)));
  // 选中的线路
  selectedLine: string = '';
  // 下拉框是否打开
  isDropdownOpen: boolean = false;
  // 分组后的数据
  groupedData: any[] = [];

  constructor() {
    this.groupData();
  }

  // 监听点击事件，点击外部关闭下拉框
  @HostListener('document:click', ['$event'])
  onDocumentClick(event: Event) {
    this.isDropdownOpen = false;
  }

  // 切换下拉框显示/隐藏
  toggleDropdown(event: Event) {
    event.stopPropagation();
    this.isDropdownOpen = !this.isDropdownOpen;
  }

  // 选择线路
  selectLine(value: string, event?: Event) {
    if (event) {
      event.stopPropagation();
    }
    this.selectedLine = value;
    this.isDropdownOpen = false;
    this.groupData();
  }

  // 分组数据
  groupData() {
    const filteredData = this.selectedLine
      ? grading_table.filter((item) => item.line === this.selectedLine)
      : grading_table;

    const grouped: any = {};

    filteredData.forEach((item) => {
      if (!grouped[item.line]) {
        // 生成图标路径
        let iconPath = '';
        const lineNumberMatch = item.line.match(/(\d+)号线/);
        if (lineNumberMatch) {
          const lineNumber = lineNumberMatch[1];
          iconPath = `/assets/images/digital-plan/lineIcon/line${lineNumber}.png`;
        } else if (item.line === '市域机场线') {
          // 特殊处理市域机场线
          iconPath = `/assets/images/digital-plan/lineIcon/line16.png`;
        }

        grouped[item.line] = {
          line: item.line,
          items: [],
          iconPath: iconPath,
        };
      }
      grouped[item.line].items.push(item);
    });

    this.groupedData = Object.values(grouped);
  }

  // 获取风险等级对应的样式类
  getRiskLevelClass(riskLevel: string): string {
    switch (riskLevel) {
      case 'R1':
        return 'risk-level-r1';
      case 'R2':
        return 'risk-level-r2';
      case 'R3':
        return 'risk-level-r3';
      case 'R4':
        return 'risk-level-r4';
      default:
        return '';
    }
  }
}
