import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { IMAGES } from '../typhoon-measures.image.component';

@Component({
  selector: 'app-emergency-warning',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './emergency-warning.component.html',
  styleUrls: ['./emergency-warning.component.less'],
})
export class EmergencyWarningComponent implements OnInit {
  // 预警图片映射
  warningImages = IMAGES;

  // 响应等级列表 - 包含每级响应需要显示预警图的列索引
  responseLevels = [
    {
      level: 'I级响应',
      warningKey: 'warning1',
      showWarningColumns: [0, 1, 2, 3, 4, 5, 6, 7, 8],
    },
    {
      level: 'II级响应',
      warningKey: 'warning2',
      showWarningColumns: [0, 1, 2, 3, 4, 5, 6, 7, 8],
    },
    {
      level: 'III级响应',
      warningKey: 'warning3',
      showWarningColumns: [1, 3, 4, 6, 7, 8],
    },
    {
      level: 'IV级响应',
      warningKey: 'warning4',
      // IV级响应：只有最后两列显示预警图
      showWarningColumns: [7, 8],
    },
  ];

  // 部门列表
  departments = [
    {
      title: '集团领导',
      positions: [
        '集团防汛指挥部总指挥（主要领导）',
        '集团防汛指挥部副总指挥（分管领导）',
      ],
    },
    {
      title: '党委党建工作部/运营部/云设部/安监部/监护办/建设集团',
      positions: ['主要领导', '分管领导', '职能科室'],
    },
    {
      title: '调度指挥中心/维保公司及专业分公司/运营公司资产公司等',
      positions: ['主要领导', '分管领导', '职能科室', '线路管理部维护部'],
    },
  ];

  constructor() {}

  ngOnInit(): void {}
}
