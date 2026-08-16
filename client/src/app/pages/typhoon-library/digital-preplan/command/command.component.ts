import { Component } from '@angular/core';
import { LibraryNzModule } from '../../../../library.nz.module';
import { environment } from '../../../../../environments/environment';

interface ICompany {
  label: string;
  items: {
    label: string;
    value: string;
  }[];
  large?: boolean;
  b2?: boolean;
  b3?: boolean;
  b4?: boolean;
  b5?: boolean;
  fontSize?: string;
  bottomLine?: string;
}

@Component({
  selector: 'digital-preplan-command',
  imports: [LibraryNzModule],
  templateUrl: './command.component.html',
  styleUrl: './command.component.less',
})
export class CommandComponent {
  hideTitle = environment.hideTitle;
  departments = [
    '市委、市政府总值班室',
    '市防汛指挥部',
    '市应急联动中心',
    '市交通委指挥中心',
    '市应急局指挥中心',
    '市国资委总值班室',
  ];
  headquarters = [
    { label: '总指挥：', value: '集团主要领导' },
    { label: '副总指挥：', value: '集团分管领导' },
    {
      label: '成员：',
      value:
        '运营管理部、运营设施设备管理部、党委党建工作部、安全生产监督管理部、监护管理办公室、技术中心、建设集团、资产公司、各运营单位等主要或分管领导',
    },
  ];
  center = [
    { label: '管辖范围：', value: '全路网' },
    { label: '地点：', value: '3C指挥大厅' },
    {
      label: '联系电话：',
      value: '600801,63189001',
    },
  ];
  companies: ICompany[] = [
    {
      label: '运一公司',
      items: [
        { label: '管辖范围：', value: '1、5、9、10号线' },
        { label: '成员：', value: '公司值班领导 生产调度' },
        { label: '联系电话：', value: '616402' },
      ],
    },
    {
      label: '运二公司',
      items: [
        { label: '管辖范围：', value: '2、11、13、17号线' },
        { label: '成员：', value: '公司值班领导 生产调度' },
        { label: '联系电话：', value: '568177' },
      ],
    },
    {
      label: '运三公司',
      items: [
        { label: '管辖范围：', value: '3、4、7、15号线' },
        { label: '成员：', value: '公司值班领导 生产调度' },
        { label: '联系电话：', value: '631656' },
      ],
    },
    {
      label: '运四公司',
      items: [
        { label: '管辖范围：', value: '6、8、12、14号线' },
        { label: '成员：', value: '公司值班领导 生产调度' },
        { label: '联系电话：', value: '686030' },
      ],
    },
    {
      label: '磁浮公司',
      items: [
        { label: '管辖范围：', value: '16、18号线、磁浮线' },
        { label: '成员：', value: '公司值班领导 生产调度' },
        { label: '联系电话：', value: '560160' },
      ],
    },
    {
      label: '申凯公司',
      items: [
        { label: '管辖范围：', value: '蒲江线' },
        { label: '成员：', value: '公司值班领导 OCC' },
        { label: '联系电话：', value: '688728' },
      ],
    },
    {
      label: '维保公司',
      items: [
        { label: '管辖范围：', value: '全线网' },
        { label: '成员：', value: '公司值班领导 生产调度' },
        { label: '联系电话：', value: '608608' },
      ],
      bottomLine: '92px',
    },
    // {
    //   label: '资产公司',
    //   items: [
    //     { label: '管辖范围：', value: '全线网' },
    //     { label: '成员：', value: '公司值班领导 总值班室' },
    //     { label: '联系电话：', value: '22057777' },
    //   ],
    // },
    // {
    //   label: '建设集团',
    //   items: [
    //     { label: '管辖范围：', value: '全路网（建设线路）' },
    //     { label: '地点：', value: '恒通路222号' },
    //     { label: '成员：', value: '公司值班领导 应急指挥中心' },
    //     { label: '联系电话：', value: '62560299' },
    //   ],
    //   large: true,
    // },
  ];
  assetCompany: ICompany = {
    label: '资产公司',
    items: [
      { label: '管辖范围：', value: '全线网' },
      { label: '成员：', value: '公司值班领导 总值班室' },
      { label: '联系电话：', value: '22057777' },
    ],
  };
  buildingCompany: ICompany = {
    label: '建设集团',
    items: [
      { label: '管辖范围：', value: '全路网（建设线路）' },
      { label: '地点：', value: '恒通路222号' },
      { label: '成员：', value: '公司值班领导 应急指挥中心' },
      { label: '联系电话：', value: '62560299' },
    ],
    b2: true,
    fontSize: '13px',
    bottomLine: '48px',
  };
  secondaryCompanies: ICompany[] = [
    {
      label: '车辆分公司',
      items: [
        { label: '管辖范围：', value: '全线网' },
        { label: '地点：', value: '梅隆基地' },
        { label: '成员：', value: '公司值班领导 生产调度' },
        { label: '联系电话：', value: '617355' },
      ],
      b3: true,
    },
    {
      label: '供电分公司',
      items: [
        { label: '管辖范围：', value: '全线网' },
        { label: '地点：', value: '北翟路基地' },
        { label: '成员：', value: '公司值班领导 生产调度' },
        { label: '联系电话：', value: '889144' },
      ],
      b3: true,
    },
    {
      label: '通号分公司',
      items: [
        { label: '管辖范围：', value: '全线网' },
        { label: '地点：', value: '梅隆基地' },
        { label: '成员：', value: '公司值班领导 生产调度' },
        { label: '联系电话：', value: '612345' },
      ],
      b3: true,
    },
    {
      label: '工务分公司',
      items: [
        { label: '管辖范围：', value: '全线网' },
        { label: '地点：', value: '梅隆基地' },
        { label: '成员：', value: '公司值班领导 生产调度' },
        { label: '联系电话：', value: '889147' },
      ],
      b3: true,
    },
    {
      label: '物资和后勤分公司',
      items: [
        { label: '管辖范围：', value: '全线网' },
        { label: '地点：', value: '石龙路基地' },
        { label: '成员：', value: '公司值班领导 生产调度' },
        { label: '联系电话：', value: '6330999' },
      ],
      b3: true,
    },
  ];
  buildingCompanies: ICompany[] = [
    {
      label: '第一分公司',
      items: [
        { label: '管辖范围：', value: '2号线西延伸、崇明线、13号线西延伸' },
        { label: '地点：', value: '宜山路1283号' },
        { label: '成员：', value: '公司值班领导 质安部' },
        { label: '联系电话：', value: '13818132630' },
      ],
      b4: true,
    },
    {
      label: '第二分公司',
      items: [
        { label: '管辖范围：', value: '14号线、17号线西延伸、19号线' },
        { label: '地点：', value: '吴中路1779号基地综合楼' },
        { label: '成员：', value: '公司值班领导　质安部' },
        { label: '联系电话：', value: '13301835647' },
      ],
      b5: true,
      fontSize: '13px',
    },
    {
      label: '第三分公司',
      items: [
        { label: '管辖范围：', value: '20号线' },
        { label: '地点：', value: '宁国路41-1号' },
        { label: '成员：', value: '公司值班领导 质安部' },
        { label: '联系电话：', value: '13641648164' },
      ],
      b3: true,
    },
    {
      label: '第四分公司',
      items: [
        { label: '管辖范围：', value: '18号线、18号线二期、21号线' },
        { label: '地点：', value: '羽山路398号' },
        { label: '成员：', value: '公司值班领导 质安部' },
        { label: '联系电话：', value: '13601918189' },
      ],
      b4: true,
    },
    {
      label: '第五分公司',
      items: [
        { label: '管辖范围：', value: '15号线、23号线' },
        { label: '地点：', value: '曹杨路78号' },
        { label: '成员：', value: '公司值班领导 质安部' },
        { label: '联系电话：', value: '13901978758' },
      ],
      b3: true,
    },
  ];
}
