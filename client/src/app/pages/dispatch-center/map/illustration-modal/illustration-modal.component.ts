import { Component, input } from '@angular/core';
import { horizontalInOutReverse } from '../../../../common.animation';
import { LibraryNzModule } from '../../../../library.nz.module';
import { getStationEventTypeIcon } from '../../../../shared/marker';
import { localEventCategories } from '../../../case-detail/selections.data';

@Component({
  selector: 'ds-illustration-modal',
  imports: [LibraryNzModule],
  animations: [horizontalInOutReverse],
  templateUrl: './illustration-modal.component.html',
  styleUrl: './illustration-modal.component.less',
  host: {
    class: 'overflow-hidden',
  },
})
export class IllustrationModalComponent {
  left = input(120);
  top = input(110);
  hideEvent = input(false);

  visible = false;
  categories = localEventCategories.filter(
    (item) => item.name !== '客运处置' && item.name !== '施工调整',
  );
  events: {
    type: string;
    icon: string;
  }[] = [
    { type: '侵限事件', icon: getStationEventTypeIcon('树枝侵限', false)[0] },
    { type: '积水事件', icon: getStationEventTypeIcon('积水', false)[0] },
    { type: '设备故障', icon: getStationEventTypeIcon('设备故障', false)[0] },
    { type: '列车故障', icon: getStationEventTypeIcon('列车故障', false)[0] },
    { type: '基地事件', icon: getStationEventTypeIcon('基地事件', false)[0] },
    { type: '其他事件', icon: getStationEventTypeIcon('其他事件', false)[0] },
  ];
  actionTypes = [
    { type: '停运', color: '#ef4444' },
    { type: '间隔调整', color: '#166534' },
    { type: '限速', color: '#fcd34d' },
    // { type: '正线留车', point: 'rgba(16, 185, 129, 0.5)' },
    // { type: '站点关闭', point: '#ef4444' },
  ];

  getEventIcon(type: string) {
    return getStationEventTypeIcon(type, false)[0];
  }
  toggleVisible() {
    this.visible = !this.visible;
  }
  setVisible(visible: boolean) {
    this.visible = visible;
  }
  close() {
    this.visible = false;
  }
}
