import { Component } from '@angular/core';
import { CommandComponent } from './command/command.component';
import { CompareComponent } from './compare/compare.component';
import { ConfigComponent } from './config/config.component';
import { LinesComponent } from './lines/lines.component';
import { environment } from '../../../../environments/environment';

@Component({
  selector: 'app-digital-preplan',
  imports: [
    LinesComponent,
    ConfigComponent,
    CompareComponent,
    CommandComponent,
  ],
  templateUrl: './digital-preplan.component.html',
  styleUrl: './digital-preplan.component.less',
})
export class DigitalPreplanComponent {
  hideTitle = environment.hideTitle;
  tabKey = 3;
  onTabChange(key: number) {
    this.tabKey = key;
  }
}
