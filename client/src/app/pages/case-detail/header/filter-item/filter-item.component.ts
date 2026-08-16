import {
  animate,
  state,
  style,
  transition,
  trigger,
} from '@angular/animations';
import {
  Component,
  ElementRef,
  EventEmitter,
  HostBinding,
  Input,
  Output,
  ViewChild,
} from '@angular/core';
import { Subscription, fromEvent } from 'rxjs';
import { LibraryNzModule } from '../../../../library.nz.module';
import { ComposeOption } from '../../case-detail.component';
import { STOP_POPPING_ATTR } from '../header.component';

@Component({
  selector: 'case-header-filter-item',
  imports: [LibraryNzModule],
  templateUrl: './filter-item.component.html',
  styleUrl: './filter-item.component.less',
  host: {
    class: 'relative',
  },
  animations: [
    trigger('dropdown', [
      state('in', style({ transform: 'translate(0, 0%)', opacity: 1 })),
      transition('void => *', [
        style({ transform: 'translate(0, -100%)', opacity: 0 }),
        animate(200),
      ]),
      transition('* => void', [
        animate(200, style({ transform: 'translate(0, -100%)', opacity: 0 })),
      ]),
    ]),
  ],
})
export class CaseHeaderFilterItemComponent {
  @ViewChild('wrapper') wrapper!: ElementRef<HTMLDivElement>;
  @ViewChild('dropdown') dropdown!: ElementRef<HTMLDivElement>;
  // dropdownVisible: boolean = false;
  listen$?: Subscription;
  @Input() reverse = false;
  @Input() label = '出错了';
  @Input() disabled = false;
  @Input() model: ComposeOption[] = [];
  @Output() onChange = new EventEmitter<ComposeOption>();
  @Output() onAllChange = new EventEmitter();
  @Input() dropdownVisible = false;
  @Output() toggleDropdownVisible = new EventEmitter<void>();
  @Output() closeDropdown = new EventEmitter<void>();

  @HostBinding(`attr.${STOP_POPPING_ATTR}`) s = true;
  onClick() {
    if (this.disabled) return;
    // this.dropdownVisible = !this.dropdownVisible;
    this.toggleDropdownVisible.emit();
    // if (this.dropdownVisible) {
    //   setTimeout(() => {
    //     this.addListener();
    //   });
    // } else {
    //   this.removeListener();
    // }
  }
  addListener() {
    this.listen$ = fromEvent(document, 'click').subscribe((e: Event) => {
      if (
        e.target &&
        !this.wrapper.nativeElement.parentElement!.contains(e.target as Node)
      ) {
        this.dropdownVisible = false;
        this.removeListener();
      }
    });
  }
  removeListener() {
    if (this.listen$) {
      this.listen$?.unsubscribe();
      this.listen$ = undefined;
    }
  }
  ngOnDestroy() {
    this.removeListener();
  }
  // isChecked(value: Option['value']) {
  //   return this.values.includes(value);
  // }

  toggleAll() {
    this.onAllChange.emit();
  }
  toggleItem(op: ComposeOption) {
    if (op.disabled) return;
    this.onChange.emit(op);
  }
  get isAllChecked() {
    return !!this.model
      .filter((option) => !option.disabled)
      .every((option) => option.checked);
  }
  get isAllUnChecked() {
    return !!this.model
      .filter((option) => !option.disabled)
      .every((option) => !option.checked);
  }
  get dropdownHeight() {
    return this.dropdownVisible ? 'auto' : 0;
  }
}
