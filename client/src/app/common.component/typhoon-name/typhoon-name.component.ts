import { Component, input, output } from '@angular/core';

@Component({
  selector: 'typhoon-name',
  imports: [],
  templateUrl: './typhoon-name.component.html',
  styleUrl: './typhoon-name.component.less',
})
export class TyphoonNameComponent {
  size = input(30);
  name = input('');
  next = input(false);

  onNext = output<void>();
}
