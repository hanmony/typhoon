import { Component, Input } from '@angular/core';

@Component({
  selector: 'guide-headline',
  imports: [],
  templateUrl: './headline.component.html',
  styleUrl: './headline.component.less',
})
export class HeadlineComponent {
  @Input() name?: string = '';
  @Input() level?: string = '';
}
