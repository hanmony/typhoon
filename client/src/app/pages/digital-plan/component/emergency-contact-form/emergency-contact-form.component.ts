import { CommonModule } from '@angular/common';
import { Component, HostListener } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CaveEntranceTableComponent } from './cave_entrance_table/cave_entrance_table.component';
import { ConstructionTableComponent } from './construction_table/construction_table.component';
import { FloodControlTableComponent } from './flood_control_table/flood_control_table.component';
import { InterconnectionTableComponent } from './interconnection_table/interconnection_table.component';
import { MaterialTransferTableComponent } from './material_transfer_table/material_transfer_table.component';

@Component({
  selector: 'app-emergency-contact-form',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    CaveEntranceTableComponent,
    InterconnectionTableComponent,
    MaterialTransferTableComponent,
    FloodControlTableComponent,
    ConstructionTableComponent,
  ],
  templateUrl: './emergency-contact-form.component.html',
  styleUrls: ['./emergency-contact-form.component.less'],
})
export class EmergencyContactFormComponent {
  // 线路选项
  lines = [
    { label: '1号线', value: 'line1' },
    { label: '2号线', value: 'line2' },
    { label: '3号线', value: 'line3' },
    { label: '4号线', value: 'line4' },
    { label: '5号线', value: 'line5' },
    { label: '6号线', value: 'line6' },
    { label: '7号线', value: 'line7' },
    { label: '8号线', value: 'line8' },
    { label: '9号线', value: 'line9' },
    { label: '10号线', value: 'line10' },
    { label: '11号线', value: 'line11' },
    { label: '12号线', value: 'line12' },
    { label: '13号线', value: 'line13' },
    { label: '14号线', value: 'line14' },
    { label: '15号线', value: 'line15' },
    { label: '16号线', value: 'line16' },
    { label: '17号线', value: 'line17' },
    { label: '18号线', value: 'line18' },
    { label: '浦江线', value: 'line19' },
    { label: '市域机场线', value: 'line22' },
    { label: '全路网', value: 'line23' },
    { label: '机场联络线', value: 'line20' },
    { label: '上海磁浮线', value: 'line21' },
  ];

  // 公司选项
  companies = [
    { label: '运一公司', value: 'company1' },
    { label: '运二公司', value: 'company2' },
    { label: '运三公司', value: 'company3' },
    { label: '运四公司', value: 'company4' },
    { label: '磁浮公司', value: 'company5' },
    { label: '申凯公司', value: 'company6' },
    { label: '市域公司', value: 'company7' },
    { label: '维保工务', value: 'company8' },
    { label: '维保物后', value: 'company9' },
  ];

  // 选中的线路（通用）
  selectedLine: string = '';
  // 选中的线路（物资和防汛专用）
  selectedMaterialFloodLine: string = '';
  // 选中的公司
  selectedCompany: string = '';
  // 线路下拉框是否打开（通用）
  isLineDropdownOpen: boolean = false;
  // 线路下拉框是否打开（物资和防汛专用）
  isMaterialFloodLineDropdownOpen: boolean = false;
  // 公司下拉框是否打开
  isCompanyDropdownOpen: boolean = false;
  // 当前显示的组件
  currentComponent: string = 'cave';

  // 监听点击事件，点击外部关闭下拉框
  @HostListener('document:click', ['$event'])
  onDocumentClick(event: Event) {
    // 点击外部时关闭下拉框
    this.isLineDropdownOpen = false;
    this.isMaterialFloodLineDropdownOpen = false;
    this.isCompanyDropdownOpen = false;
  }

  // 切换下拉框显示/隐藏
  toggleDropdown(type: string, event: Event) {
    event.stopPropagation();
    if (type === 'line') {
      this.isLineDropdownOpen = !this.isLineDropdownOpen;
      this.isMaterialFloodLineDropdownOpen = false;
      this.isCompanyDropdownOpen = false;
    } else if (type === 'materialFloodLine') {
      if (!this.selectedCompany) {
        return;
      }
      this.isMaterialFloodLineDropdownOpen =
        !this.isMaterialFloodLineDropdownOpen;
      this.isLineDropdownOpen = false;
      this.isCompanyDropdownOpen = false;
    } else if (type === 'company') {
      this.isCompanyDropdownOpen = !this.isCompanyDropdownOpen;
      this.isLineDropdownOpen = false;
      this.isMaterialFloodLineDropdownOpen = false;
    }
  }

  // 选择线路（通用）
  selectLine(value: string, event?: Event) {
    if (event) {
      event.stopPropagation();
    }
    this.selectedLine = value;
    this.isLineDropdownOpen = false;
  }

  // 选择线路（物资和防汛专用）
  selectMaterialFloodLine(value: string, event?: Event) {
    if (event) {
      event.stopPropagation();
    }
    this.selectedMaterialFloodLine = value;
    this.isMaterialFloodLineDropdownOpen = false;
  }

  // 选择公司
  selectCompany(value: string, event?: Event) {
    if (event) {
      event.stopPropagation();
    }
    this.selectedCompany = value;
    this.isCompanyDropdownOpen = false;

    // Reset line selection if company is deselected
    if (!value) {
      this.selectedMaterialFloodLine = '';
    }
  }

  // 获取选中的线路标签（通用）
  getSelectedLineLabel(): string {
    const line = this.lines.find((l) => l.value === this.selectedLine);
    return line ? line.label : '';
  }

  // 获取选中的线路标签（物资和防汛专用）
  getSelectedMaterialFloodLineLabel(): string {
    const line = this.lines.find(
      (l) => l.value === this.selectedMaterialFloodLine,
    );
    return line ? line.label : '';
  }

  // 获取选中的公司标签
  getSelectedCompanyLabel(): string {
    const company = this.companies.find(
      (c) => c.value === this.selectedCompany,
    );
    return company ? company.label : '';
  }

  // 切换显示组件
  showComponent(component: string) {
    this.currentComponent = component;
  }

  // 检查是否需要显示公司下拉框
  shouldShowCompanyDropdown(): boolean {
    return (
      this.currentComponent === 'flood' || this.currentComponent === 'material'
    );
  }

  // 重置所有筛选条件
  resetFilters() {
    this.selectedLine = '';
    this.selectedMaterialFloodLine = '';
    this.selectedCompany = '';
    this.isLineDropdownOpen = false;
    this.isMaterialFloodLineDropdownOpen = false;
    this.isCompanyDropdownOpen = false;
  }
}
