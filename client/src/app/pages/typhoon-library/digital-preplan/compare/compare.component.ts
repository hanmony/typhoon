import { Component } from '@angular/core';

interface IAlertData {
  duty: string[];
  inspect: string[];
  other: string[];
}
interface IAlertDto {
  key: string;
  label: string;
  activeColor: string;
  data: IAlertData;
}

const blueAlertData: IAlertData = {
  duty: [
    '1.加强一线关键岗位值班值守；',
    '2.密切监视天气动态变化与汛情灾情，及时落实对应措施；',
    '3.COCC及时发布应对灾害天气的防御工作要求或工作指令。',
  ],
  inspect: [
    '1.加强重点部位、薄弱环节巡视检查，频次不应低于每2小时一次；站外独立变电站等其他部位，应至少增加一次巡检；',
    '2.实施“一洞一长”机制，安排专人落实“人机结合”巡检，频次不应低于每2小时一次；',
    '3.视情调整或取消非必要施工计划，增设防汛防台保障临时巡检施工；',
    '4.做好防洪排涝设施设备的性能检查与加固紧固，加强重点部位渗漏水、积水、淹水倒灌、异物侵限等情况的排摸处置；',
    '5.司机（多职能列控）应加强安全瞭望，如遇异常情 况要立即采取安全措施并上报；',
    '6.如遇异常情况，应立即安排专人至现场巡查确认或 登车保驾，并及时采取防排水、异物清除、设备维修 等措施；',
    '7.如接到高潮位、洪水等预警信息，沿江、河、湖场所应密切监视汛情险情。',
  ],
  other: [
    '1.车站应针对出入口、通道、站台、楼/扶梯等重点部位做好防滑防护措施，加强乘客出行安全宣传与提示；',
    '2.落实作业安全防护措施，保障人员安全、作业安全。',
  ],
};

const yellowAlertData: IAlertData = {
  duty: [
    '1.相关直属单位的职能部门、线路管理部、维护部等负责人加强值班值守，对一线作业进行监督指导；',
    '2.加强灾害天气风险及影响研判；',
    '3.抢险队伍进入应急值班状态，做好抢险物资随时调 运的准备。',
  ],
  inspect: [
    '1.进一步提升重点部位、薄弱环节巡视检查频次，频次不应该低于每1小时一次；其他部位应视情增加巡视频次；',
    '2.进一步加强“一洞一长”巡视检查，频次不应该低于每1小时一次；',
    '3.加强各项夜间检修工作，重点做好防汛防台设施、各类附属设施、区间垃圾河易积水区段的检查、维护清理工作；',
    '4.司机（多职能列控）应进一步加强对沿线洞口区域异物侵限、设施设备故障/松脱、区间积水等情况的安全瞭望。',
  ],
  other: [
    '1.加强车站客流秩序管控、重点部位布岗，防止客流对冲风险；',
    '2.根据需要及时采取关闭出入口、降级运行、限速运行等调整措施。',
  ],
};
const orangeAlertData: IAlertData = {
  duty: [
    '1.相关直属单位进一步加强领导干部值班，分管领导及时组织落实各项防御应对措施与抢险处置工作；',
    '2.抢险队伍进入应急处置状态，做好抢险力量及时响 应的准备。',
  ],
  inspect: [
    '1.针对重点部位、薄弱环节实施不间断巡视检查，站外独立变电站、运营线路未开通车站、建设运营接口部位等场所应安排人员24小时值守；',
    '2.进一步加强“一洞一长”巡视检查，洞口管理责任人应安排专人进行24小时现场值守巡视；',
    '3.司机（多职能列控）应在列车头端侧值守瞭望。',
  ],
  other: [
    '1.根据需要进一步采取关站、停运、正线留车过夜等 措施；',
    '2.及时联合属地力量或上级申请支援，做好滞留乘客的疏导转运；',
    '3.加强与市、区防汛指挥机构的联系，必要时申请外部力量支援。',
  ],
};
const redAlertData: IAlertData = {
  duty: [
    '1.相关直属单位主要领导组织指挥全力投入抢险救援工作；',
    '2.全面加强汛情监控、营销研判、信息互通、联动协作，全面投入应急抢险工作；',
    '3.抢险队伍进入应急抢险状态，各单位积极为防汛台工作提供全力保障。',
  ],
  inspect: [
    '1.全面落实不间断巡视检查与措施落实，做到早发现、早处置，确保运营安全有序可控。',
  ],
  other: [
    '1.进一步严密关注轨道交通运营安全，全力做好行车组织调整、客运组织、抢险抢修工作，保障人员安全，将影响和损失降至最低。',
  ],
};

@Component({
  selector: 'digital-preplan-compare',
  imports: [],
  templateUrl: './compare.component.html',
  styleUrl: './compare.component.less',
})
export class CompareComponent {
  alerts: IAlertDto[] = [
    // { key: 'BLUE', label: '蓝', activeColor: '#2ECBF5' },
    // { key: 'YELLOW', label: '黄', activeColor: '#F3FF1F' },
    // { key: 'ORANGE', label: '橙', activeColor: '#FF9600' },
    // { key: 'RED', label: '红', activeColor: '#FF0000' },
    { key: 'BLUE', label: '蓝', activeColor: '#0ea5e9', data: blueAlertData },
    {
      key: 'YELLOW',
      label: '黄',
      activeColor: '#fde047',
      data: yellowAlertData,
    },
    {
      key: 'ORANGE',
      label: '橙',
      activeColor: '#f97316',
      data: orangeAlertData,
    },
    { key: 'RED', label: '红', activeColor: '#ef4444', data: redAlertData },
  ];
  activeAlert = 'BLUE';
  list = [
    { label: '值守保驾', key: 'duty' },
    { label: '巡视检查', key: 'inspect' },
    { label: '其他要求', key: 'other' },
  ];
  get activeAlertDto() {
    return this.alerts.find((alert) => alert.key === this.activeAlert);
  }
  changeAlert(alert: string) {
    this.activeAlert = alert;
  }
}
