import {
  Component,
  ElementRef,
  ViewChild,
  computed,
  input,
  output,
  signal,
} from '@angular/core';
import { Subscription, fromEvent } from 'rxjs';

@Component({
  selector: 'occ-modal-select',
  imports: [],
  templateUrl: './select.component.html',
  styleUrl: './select.component.less',
})
export class OccModalSelectComponent {
  @ViewChild('optionsRef') optionsRef!: ElementRef<HTMLDivElement>;

  multiple = input<boolean>(false);
  value = input.required<string | string[]>();
  options = input.required<string[]>();
  placeholder = input<string>('');
  disabled = input<boolean>(false);

  change = output<string | string[]>();

  collapsed = signal(true);

  label = computed(() => {
    const multiple = this.multiple();
    const value = this.value();
    if (multiple) {
      if (Array.isArray(value)) {
        return (value as string[]).join(', ');
      } else {
        return value as string;
      }
    }
    return this.options().find((o) => o === this.value()) ?? '';
  });

  clickHandler() {
    if (this.disabled()) {
      return;
    }
    this.toggle();
  }

  onSelect(ev: Event, value: string | string[]) {
    ev.stopPropagation();
    ev.preventDefault();
    if (this.multiple()) {
      const values = this.value() as string[];
      if (values.includes(value as string)) {
        this.change.emit(values.filter((v) => v !== value));
      } else {
        this.change.emit([...values, value as string]);
      }
    } else {
      this.change.emit(value as string);
      this.close();
    }
    return false;
  }
  itemIsCheck(option: string) {
    const multiple = this.multiple();
    if (multiple) {
      return (this.value() as string[]).includes(option);
    }
    return this.value() === option;
  }

  $subscription?: Subscription;

  close() {
    this.collapsed.set(true);
    this.removeListener();
  }
  open() {
    if (this.disabled()) {
      return;
    }
    this.collapsed.set(false);
    this.addListener();
  }
  toggle() {
    if (this.disabled()) {
      return;
    }
    if (this.collapsed()) {
      this.open();
    } else {
      this.close();
    }
  }
  addListener() {
    this.$subscription = fromEvent(document, 'click').subscribe((e: Event) => {
      if (
        e.target &&
        !this.multiple() &&
        !this.optionsRef?.nativeElement.parentElement!.contains(
          e.target as Node,
        )
      ) {
        this.collapsed.set(true);
        this.removeListener();
      }
    });
  }
  removeListener() {
    if (this.$subscription) {
      this.$subscription?.unsubscribe();
      this.$subscription = undefined;
    }
  }
}
