import { Component, input } from '@angular/core';

@Component({
  selector: 'dispatch-module-header',
  imports: [],
  templateUrl: './module-header.component.html',
  styleUrl: './module-header.component.less',
})
export class ModuleHeaderComponent {
  title = input.required<string>();
  height = input<number>(28);
}
