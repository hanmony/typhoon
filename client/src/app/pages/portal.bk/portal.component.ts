import { AfterViewInit, Component, ElementRef, ViewChild } from '@angular/core';

import { fromEvent } from 'rxjs';
import { LibraryNzModule } from '../../library.nz.module';
import { PortalCaseListComponent } from './case-list/case-list.component';
import { PortalDiscoverComponent } from './discover/discover.component';
import { PortalHeaderComponent } from './header/header.component';

@Component({
  selector: 'app-portal',
  imports: [
    LibraryNzModule,
    PortalHeaderComponent,
    PortalDiscoverComponent,
    PortalCaseListComponent,
  ],
  templateUrl: './portal.component.html',
  styleUrl: './portal.component.less',
})
export class PortalComponent implements AfterViewInit {
  @ViewChild('portal') portal!: ElementRef<HTMLDivElement>;
  @ViewChild('discover') discover!: ElementRef<HTMLDivElement>;

  directArrowVisible = true;
  currentIndex: number = 0;
  swipePanels: HTMLDivElement[] = [];
  ngAfterViewInit(): void {
    const discoverDom = this.discover.nativeElement;
    fromEvent(document, 'scroll')
      .pipe()
      .subscribe((event) => {
        const { scrollTop, offsetHeight } = document.documentElement;
        if (scrollTop > offsetHeight / 3) {
          this.directArrowVisible = false;
        } else {
          this.directArrowVisible = true;
        }
      });
  }
  toSecondPage() {
    const caseListDom =
      this.portal.nativeElement.querySelector('portal-case-list');
    caseListDom &&
      caseListDom.scrollIntoView({
        behavior: 'smooth',
      });
  }
}
