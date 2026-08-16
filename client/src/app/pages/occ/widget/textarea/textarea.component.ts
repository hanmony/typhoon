import { Component, input, output } from '@angular/core';

@Component({
  selector: 'occ-modal-textarea',
  imports: [],
  templateUrl: './textarea.component.html',
  styleUrl: './textarea.component.less',
})
export class OccModalTextareaComponent {
  max = input<number>(200);
  value = input.required<string>();
  placeholder = input<string>('');

  changeValue = output<string>();

  onInput(event: Event) {
    this.changeValue.emit((event.target as HTMLInputElement).value);
  }
}
