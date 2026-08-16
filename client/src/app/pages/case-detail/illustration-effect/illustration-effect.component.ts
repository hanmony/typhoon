import { CommonModule } from '@angular/common';
import { Component, Input } from '@angular/core';

@Component({
  selector: 'illustration-effect',
  imports: [CommonModule],
  templateUrl: './illustration-effect.component.html',
  styleUrl: './illustration-effect.component.less',
})
export class IllustrationEffectComponent {
  @Input() subType = '';
}
