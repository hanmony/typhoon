import { Component, input } from '@angular/core';
import { CategorizeFocusComponent } from './categorize-focus/categorize-focus.component';
import { CategorizeTypesComponent } from './categorize-types/categorize-types.component';

@Component({
  selector: 'supervisor-line-situation',
  imports: [CategorizeTypesComponent, CategorizeFocusComponent],
  templateUrl: './line-situation.component.html',
  styleUrl: './line-situation.component.less',
})
export class LineSituationComponent {
  events = input<ExtremeOcc.Event[]>([]);
}
