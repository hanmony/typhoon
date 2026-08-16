import { Component, input, output } from '@angular/core';
import Color from 'color';
import { interval, Subscription } from 'rxjs';
import {
  lineColorMap2026,
  linesData2026,
} from '../../../case-detail/services/meta';
import { PatrollingLineCardComponent } from '../line-card/line-card.component';
import { ApiService } from './../../../../services/api.service';
import { PatrollingDiagramService } from './../../../../shared/patrolling/patrolling.diagram.service';
import PatrollingTour from './../../../../shared/patrolling/patrolling.tour.class';

export interface PatrollingStatistic {
  name: string;
  primaryColor: string;
  secondaryColor: string;
  patrolling: boolean;
  finished: boolean;
  expiration: number;
  endTime: number;
}

const getLineMainColor = (line: string) => {
  // if (line === '4号线') {
  //   return '#672bc2';
  // }
  return lineColorMap2026.get(line) || '#AED3B5';
};
const getLightenMainColor = (color: string) => {
  return Color(color).lighten(0.17).toString();
};
const getLineBackgroundColor = (line: string) => {
  const main = getLightenMainColor(getLineMainColor(line));
  return Color(main).alpha(0.4).toString();
};

@Component({
  selector: 'patrolling-line-list',
  imports: [PatrollingLineCardComponent],
  templateUrl: './line-list.component.html',
  styleUrl: './line-list.component.less',
})
export class PatrollingLineListComponent {
  isCocc = input(false);
  isSupervisor = input(false);
  toDetail = output<PatrollingStatistic>();
  visible = input(false);

  intervalUpdateData$ = interval(1000);
  intervalUpdateDataSubscription?: Subscription;

  intervalFetchData$ = interval(5000);
  intervalFetchDataSubscription?: Subscription;

  // now = new Date();
  lines: PatrollingStatistic[] = linesData2026.map((l, _i) => {
    return {
      name: l.name,
      primaryColor: getLightenMainColor(getLineMainColor(l.name)),
      secondaryColor: getLineBackgroundColor(l.name),
      patrolling: false,
      finished: false,
      expiration: 0,
      endTime: Date.now(),
    };
  });

  constructor(
    private api: ApiService,
    private patrollingService: PatrollingDiagramService,
  ) {}
  ngOnInit() {
    this.fetchTours();
  }

  ngAfterViewInit() {
    this.intervalFetchDataSubscription = this.intervalUpdateData$.subscribe(
      this.fetchTours.bind(this),
    );
    this.intervalUpdateDataSubscription = this.intervalUpdateData$.subscribe(
      this.updateData.bind(this),
    );
  }

  ngOnDestroy() {
    this.intervalUpdateDataSubscription?.unsubscribe();
    this.intervalFetchDataSubscription?.unsubscribe();
  }

  async fetchTours() {
    if (!this.visible()) return;
    const tours = await this.api.patrolling.getTourList();
    this.resetDataByTours(tours);
  }
  resetDataByTours(tours: PatrollingType.TourDto[]) {
    const lineMap = new Map<string, PatrollingType.TourDto[]>();
    tours.forEach((t) => {
      if (lineMap.get(t.line)) {
        lineMap.get(t.line)?.push(t);
      } else {
        lineMap.set(t.line, [t]);
      }
    });

    this.lines.forEach((line) => {
      const lineMeta = this.patrollingService.getLineMeta(line.name);
      if (!lineMeta || !lineMap.get(line.name)) {
        line.patrolling = false;
        line.expiration = 0;
      } else {
        const currentLineTours = lineMap.get(line.name) || [];
        const currentLineTourInstances = currentLineTours.map(
          (t) =>
            new PatrollingTour({
              isTemporary: true,
              meta: {
                line: t.line,
                identifiers: t.identifiers,
                startTime: new Date(t.startTime),
                speed: t.speed,
                id: t.id,
                serialNumber: t.serialNumber,
                createTime: new Date(t.createTime),
              },
              lineMeta: lineMeta,
            }),
        );
        const maxEndDate = Math.max(
          ...currentLineTourInstances.map((t) => t.endDate.getTime()),
        );
        line.patrolling = true;
        line.endTime = maxEndDate;
      }
    });

    this.updateData();
  }

  updateData() {
    this.lines.forEach((line) => {
      if (!line.patrolling) return;
      const { endTime } = line;
      const now = Date.now();
      const last = Math.floor(endTime - now);
      line.expiration = last > 0 ? last : 0;
      if (line.expiration === 0) {
        line.finished = true;
      }
    });
  }
}
