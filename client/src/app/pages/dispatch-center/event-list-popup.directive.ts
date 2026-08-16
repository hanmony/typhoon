import {
  ComponentRef,
  Directive,
  EventEmitter,
  HostListener,
  Input,
  Output,
  ViewContainerRef,
} from '@angular/core';
import { EventListPopupComponent } from './event-list-popup/event-list-popup.component';

@Directive({
  // imports: [EventListPopupComponent],
  selector: '[dispatchCenterEventListPopup]',
  standalone: true,
})
export class EventListPopupDirective {
  // private el = inject(ElementRef);
  listPopup?: ComponentRef<EventListPopupComponent>;
  constructor(
    // private templateRef: TemplateRef<any>,
    private vcRef: ViewContainerRef,
  ) {}
  // private eventListPopupService = inject(EventListPopupService);

  @Input() data: ExtremeOcc.Event[] = [];
  @Input() titleText: string = '';

  @Output() locating = new EventEmitter<ExtremeOcc.Event>();

  @HostListener('click') onClick() {
    this.toggleEventListPopup();
  }

  toggleEventListPopup() {
    if (this.listPopup) {
      this.clearEventListPopup();
    } else {
      this.createEventListPopup();
    }
  }
  createEventListPopup() {
    const listPopup = this.vcRef.createComponent(EventListPopupComponent, {});
    listPopup.instance.setVisible(true);
    listPopup.instance.setData(this.data);
    listPopup.instance.setTitleText(this.titleText);
    listPopup.instance.setCloseCallback(this.clearEventListPopup.bind(this));
    listPopup.instance.setLocatingCallback(this.handleLocate.bind(this));
    this.listPopup = listPopup;
  }
  handleLocate(ev: ExtremeOcc.Event) {
    this.locating.emit(ev);
  }
  clearEventListPopup() {
    this.listPopup?.instance.setVisible(false);
    setTimeout(() => {
      this.listPopup?.destroy();
      this.listPopup = undefined;
    }, 300);
  }
}
