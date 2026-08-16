import { Component, EventEmitter, Input, Output } from '@angular/core';
import { LibraryNzModule } from '../../../library.nz.module';

@Component({
  selector: 'common-event-detail-box',
  imports: [LibraryNzModule],
  templateUrl: './common-event-detail-box.component.html',
  styleUrl: './common-event-detail-box.component.less',
})
export class CommonEventDetailBoxComponent {
  @Input() title = '';
  @Input() closeable = false;
  @Output() closeHandler = new EventEmitter();
  constructor() {}

  close() {
    this.closeHandler.emit();
  }
}
