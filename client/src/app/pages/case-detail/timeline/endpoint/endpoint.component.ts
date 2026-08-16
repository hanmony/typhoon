import { Component, EventEmitter, Input, Output } from '@angular/core';
import { LibraryNzModule } from '../../../../library.nz.module';

@Component({
  selector: 'timeline-endpoint',
  imports: [LibraryNzModule],
  templateUrl: './endpoint.component.html',
  styleUrl: './endpoint.component.less',
})
export class EndpointComponent {
  @Input() active: boolean = false;
  @Input() disabled: boolean = false;
  @Input() sliceLeft: boolean = false;
  @Input() sliceRight: boolean = false;
  @Input() text = '';
  @Output() click = new EventEmitter();

  handleClick() {
    // this.active = !this.active;
    this.click.emit();
  }
  get icon() {
    if (this.disabled) {
      return this.disabledIcon;
    }
    if (this.active) {
      return this.activeIcon;
    }
    return this.defaultIcon;
  }
  get disabledIcon() {
    return `assets/images/map/timeline/disable-endpoint.png`;
  }
  get activeIcon() {
    return `assets/images/map/timeline/endpoint-active.png`;
  }
  get defaultIcon() {
    return `assets/images/map/timeline/endpoint.png`;
  }
}
