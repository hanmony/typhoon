import { Component } from '@angular/core';
import { horizontalInOut } from '../../../../common.animation';
import { LibraryNzModule } from '../../../../library.nz.module';
import { TyphoonCompareService } from '../typhoon.compare.service';

@Component({
  selector: 'simple-compare-actions',
  imports: [LibraryNzModule],
  templateUrl: './simple-compare-actions.component.html',
  styleUrl: './simple-compare-actions.component.less',
  animations: [horizontalInOut],
})
export class SimpleCompareActionsComponent {
  constructor(private typhoonCompareService: TyphoonCompareService) {}

  get show() {
    return this.typhoonCompareService.isComparing;
  }

  get typhoonNames() {
    return this.typhoonCompareService.currentCompareTyphoonNames || [];
  }

  get currentExistState() {
    return this.typhoonCompareService.currentExistState();
  }

  cancelComparing(id: string) {
    this.typhoonCompareService.cancelComparing(id);
  }
  toggleVisible(id: string) {
    this.typhoonCompareService.toggleVisible(id);
  }
}
