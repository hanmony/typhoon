import { Component } from '@angular/core';
import { horizontalInOutReverse } from '../../../../common.animation';
import { LibraryNzModule } from '../../../../library.nz.module';
import { IllustrationEffectComponent } from '../../illustration-effect/illustration-effect.component';
import {
  symbolMapping,
  symbolPrefix,
} from '../../services/local-event-react.service';
import { localEventCategories } from './../../selections.data';

@Component({
  selector: 'dock-illustration-modal',
  imports: [LibraryNzModule, IllustrationEffectComponent],
  animations: [horizontalInOutReverse],
  templateUrl: './illustration-modal.component.html',
  styleUrl: './illustration-modal.component.less',
  host: {
    class: 'overflow-hidden',
  },
})
export class IllustrationModalComponent {
  visible = false;
  categories = localEventCategories.filter(
    (item) => item.name !== '客运处置' && item.name !== '施工调整',
  );
  toggleVisible() {
    this.visible = !this.visible;
  }
  close() {
    this.visible = false;
  }
  getImage(label: string) {
    if (symbolMapping[label]) {
      return symbolPrefix + symbolMapping[label];
    }
    return '';
  }
}
