import { Component, computed, input, output } from '@angular/core';

export interface PopupConfig {
  visible: boolean;
  scale?: number;
  type: 'supervision' | 'urgentRepair';
  data: ExtremeOcc.Event | null;
  x: number;
  y: number;
}

@Component({
  selector: 'dashboard-detail-popup',
  imports: [],
  templateUrl: './detail-popup.component.html',
  styleUrl: './detail-popup.component.less',
})
export class DetailPopupComponent {
  config = input.required<PopupConfig>();
  onClose = output();

  infos = computed(() => {
    const { data, type } = this.config();
    if (!data) return [];
    if (type === 'supervision') {
      return [{ label: '问题关联', value: data.associatedPoint }];
    }
    return [
      { label: '抢修单位', value: data.repairUnits?.join(', ') || '' },
      { label: '负责人', value: data.responsiblePerson || '' },
      { label: '联系电话', value: data.contactPhone || '' },
    ];
  });
}
