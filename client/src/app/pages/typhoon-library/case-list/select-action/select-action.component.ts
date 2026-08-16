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
  Input,
  Output,
  ViewChild,
} from '@angular/core';
import { Subscription, fromEvent } from 'rxjs';
import { LibraryNzModule } from '../../../../library.nz.module';

@Component({
  selector: 'select-action',
  imports: [LibraryNzModule],
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
  templateUrl: './select-action.component.html',
  styleUrl: './select-action.component.less',
})
export class SelectActionComponent {
  @Input() placeholder: string = '请选择';
  @Input() value: string = '';
  @Input() options: Option<string>[] = [];
  @Output() onChange = new EventEmitter<string>();
  @ViewChild('wrapper') wrapper!: ElementRef<HTMLDivElement>;
  @ViewChild('dropdown') dropdown!: ElementRef<HTMLDivElement>;
  dropdownVisible: boolean = false;
  listen$?: Subscription;

  onClick() {
    this.dropdownVisible = !this.dropdownVisible;
    if (this.dropdownVisible) {
      setTimeout(() => {
        this.addListener();
      });
    } else {
      this.removeListener();
    }
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
  handleSelectAll() {}
  handleSelect(op: Option<string>) {
    // this.select.emit(action);
    this.dropdownVisible = false;
    this.onChange.emit(op.value);
    this.removeListener();
  }
  ngOnDestroy() {
    this.removeListener();
  }
  get label() {
    if (!this.value) return '';
    return this.options.find((op) => op.value === this.value)?.label || '';
  }
}
