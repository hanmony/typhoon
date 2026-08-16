import { Component, Input } from '@angular/core';
import { horizontalInOut } from '../../../../common.animation';
import { CaseDto } from '../../../../domain/case.dto';

@Component({
  selector: 'dock-public-opinion-information',
  imports: [],
  animations: [horizontalInOut],
  templateUrl: './public-opinion-information.component.html',
  styleUrl: './public-opinion-information.component.less',
})
export class PublicOpinionInformationComponent {
  @Input() data!: CaseDto;
  visible = false;
  toggleVisible() {
    this.visible = !this.visible;
  }
  close() {
    this.visible = false;
  }

  formatNumber(numberStr?: string) {
    if (!numberStr) return 0;
    return parseInt(numberStr, 10) || 0;
  }
  getValue(data: CaseDto, key: string) {
    return data?.values[key]?.value || '-';
  }
}
