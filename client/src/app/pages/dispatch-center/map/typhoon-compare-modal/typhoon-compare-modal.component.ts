import { Component, signal } from '@angular/core';
import { NzMessageService } from 'ng-zorro-antd/message';
import { scaleInOut } from '../../../../common.animation';
import { OccTyphoonService } from '../../../occ/map/typhoon.occ.service';
import { TyphoonCompareService } from '../typhoon.compare.service';

@Component({
  selector: 'typhoon-compare-modal',
  imports: [],
  templateUrl: './typhoon-compare-modal.component.html',
  styleUrl: './typhoon-compare-modal.component.less',
  animations: [scaleInOut],
})
export class TyphoonCompareModalComponent {
  visible = signal(false);
  setVisible(visible: boolean) {
    this.visible.set(visible);
    if (visible) {
      this.selectIds.set(this.compareService.currentComparingIds());
    }
  }
  onClose() {
    this.visible.set(false);
  }
  get list() {
    const allTyphoons = this.compareService.computedHistoryTyphoons() || [];

    // 如果当前有模拟台风，过滤掉与模拟台风相同unitKey的历史台风
    const currentSimulatedTyphoonUnitKey = this.occTyphoonService.unitKey;

    if (currentSimulatedTyphoonUnitKey) {
      return allTyphoons.filter(
        (t) => t.unitKey !== currentSimulatedTyphoonUnitKey,
      );
    }

    return allTyphoons;
  }

  selectIds = signal<string[]>([]);
  onSelect(id: string) {
    const currentSelections = this.selectIds();
    if (currentSelections.includes(id)) {
      // 已选择，取消选择
      this.selectIds.set(currentSelections.filter((i) => i !== id));
    } else {
      // 未选择，检查是否已达到最大限制（最多3个）
      if (currentSelections.length >= 3) {
        // 添加最新选择，替换最早的选择
        this.message.warning('最多只能选择3个台风');
        this.selectIds.set([id, ...currentSelections.slice(0, 2)]);
      } else {
        // 添加最新选择
        this.selectIds.set([...currentSelections, id]);
      }
    }
  }
  constructor(
    private compareService: TyphoonCompareService,
    private message: NzMessageService,
    private occTyphoonService: OccTyphoonService,
  ) {
    compareService.compareChangeSubject$.subscribe((ids) => {
      this.selectIds.set(ids);
    });
  }
  ngAfterViewInit() {
    this.compareService.fetchHistoryTyphoons();
  }

  onConfirm() {
    const ids = this.selectIds();
    this.compareService.setComparedTyphoons(ids);
    this.onClose();
  }

  getTyphoonDegreeColor(degreeText: string) {
    return this.compareService.getTyphoonDegreeColor(degreeText);
  }
}
