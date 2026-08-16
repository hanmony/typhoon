import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { Title } from '@angular/platform-browser';
import { RouterOutlet } from '@angular/router';

@Component({
  selector: 'app-root',
  imports: [CommonModule, RouterOutlet],
  template: `<router-outlet></router-outlet>`,
  styleUrl: './app.component.less',
})
export class AppComponent {
  constructor(title: Title) {
    title.setTitle('申轨防汛智策云平台');
  }
  ngAfterViewInit() {
    if (this.isFirefox()) {
      this.attachPrivateStyle();
    }
  }
  isFirefox() {
    return navigator.userAgent.indexOf('Firefox') !== -1;
  }
  attachPrivateStyle() {
    const style = document.createElement('style');
    style.innerHTML = `
      .custom-scroll-bar {
        scrollbar-color: rgba(39, 94, 193, 0.85) rgba(114, 196, 250, 0.45);
        scrollbar-width: thin;
      }
    `;
    document.head.appendChild(style);
  }
}
