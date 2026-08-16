import {
  Component,
  computed,
  ElementRef,
  signal,
  ViewChild,
} from '@angular/core';
import { Subject } from 'rxjs';
import { throttleTime } from 'rxjs/operators';
import { ModuleHeaderComponent } from './../../module-header/module-header.component';

interface Team {
  name: string;
  id: number;
  status: number;
}

@Component({
  selector: 'emergency-team-module',
  imports: [ModuleHeaderComponent],
  templateUrl: './emergency-team.component.html',
  styleUrl: './emergency-team.component.less',
})
export class EmergencyTeamComponent {
  @ViewChild('container') container!: ElementRef<HTMLDivElement>;
  @ViewChild('flow') flow!: ElementRef<HTMLDivElement>;

  private wheelSubject$ = new Subject<Event>();

  constructor() {
    this.wheelSubject$.pipe(throttleTime(300)).subscribe((ev) => {
      this.handleWheel(ev);
    });
  }

  allTeams = signal<Team[]>(
    Array.from({ length: 34 }, (_, index) => ({
      name: `XX抢修队${index + 1}`,
      id: index + 1,
      status: Math.floor(Math.random() * 2),
    })),
  );

  pagedTeams = computed(() => {
    const teams = this.allTeams();
    const pagedTeams: Team[][] = [];
    for (let i = 0; i < teams.length; i += 12) {
      pagedTeams.push(teams.slice(i, i + 12));
    }
    return pagedTeams;
  });

  width = signal(646);
  activePageIndex = signal(0);
  scrollWidth = computed(() => this.width() * this.activePageIndex());

  ngAfterViewInit() {
    this.width.set(this.container.nativeElement.offsetWidth);
    this.flowScroll();
  }
  flowScroll() {
    const dom = this.flow.nativeElement;
    if (dom) {
      dom.scrollTo({
        left: this.scrollWidth(),
        behavior: 'smooth',
      });
    }
  }

  nextPage() {
    this.activePageIndex.update((v) => v + 1);
    this.flowScroll();
  }

  prevPage() {
    this.activePageIndex.update((v) => v - 1);
    this.flowScroll();
  }

  goToPage(index: number) {
    this.activePageIndex.set(index);
    this.flowScroll();
  }

  getImageUrl(status: number) {
    return `assets/images/dispatch-center/team-${status ? 'blue' : 'orange'}.png`;
  }

  onMouseWheel(event: Event) {
    this.wheelSubject$.next(event);
  }

  handleWheel(event: Event) {
    const direction = (event as WheelEvent).deltaY > 0 ? 'next' : 'prev';
    const activePageIndex = this.activePageIndex();
    if (
      direction === 'next' &&
      activePageIndex < this.pagedTeams().length - 1
    ) {
      this.nextPage();
      event.preventDefault();
    } else if (direction === 'prev' && activePageIndex > 0) {
      this.prevPage();
      event.preventDefault();
    }
  }
}
