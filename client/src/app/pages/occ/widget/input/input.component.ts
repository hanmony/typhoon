import { Component, input, output } from '@angular/core';

@Component({
  selector: 'occ-modal-input',
  imports: [],
  templateUrl: './input.component.html',
  styleUrl: './input.component.less',
})
export class OccModalInputComponent {
  type = input<'text' | 'number'>('text');
  value = input.required<string>();
  placeholder = input<string>('');

  changeValue = output<string>();

  onInput(event: Event) {
    const value = (event.target as HTMLInputElement).value;
    if (this.type() === 'number') {
      this.changeValue.emit(value.replace(/[^\d]/g, ''));
    } else {
      this.changeValue.emit(value);
    }
  }
}
