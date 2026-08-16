import { Component, input, output } from '@angular/core';

@Component({
  selector: 'extreme-tabs',
  imports: [],
  templateUrl: './extreme-tabs.component.html',
  styleUrl: './extreme-tabs.component.less',
})
export class ExtremeTabsComponent {
  tabs = input<string[]>();
  activeTab = input<string>();
  onClick = output<string>();
  onTabItemClick(tab: string) {
    this.onClick.emit(tab);
  }
}
