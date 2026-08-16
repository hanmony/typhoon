import {
  Component,
  computed,
  ElementRef,
  input,
  output,
  signal,
  ViewChild,
} from '@angular/core';
import { interval, Subscription } from 'rxjs';
import { ExtremeSelectComponent } from '../../../../common.component/extreme-select/extreme-select.component';
import { ApiService } from '../../../../services/api.service';
import { PatrollingDiagramService } from '../../../../shared/patrolling/patrolling.diagram.service';
import { PatrollingLine } from '../../../../shared/patrolling/patrolling.line.class';
import {
  diffTours,
  validateTours,
} from '../../../../shared/patrolling/patrolling.utils';
import { linesData2026 } from '../../../case-detail/services/meta';

@Component({
  selector: 'patrolling-detail',
  imports: [ExtremeSelectComponent],
  templateUrl: './patrolling-detail.component.html',
  styleUrl: './patrolling-detail.component.less',
})
export class PatrollingDetailComponent {
  @ViewChild('box') box!: ElementRef<HTMLDivElement>;
  @ViewChild('diagram') diagram!: ElementRef<HTMLDivElement>;

  visible = input(false);
  isSupervisor = input<boolean>(false);

  initialLine = input('1号线');
  onClose = output<void>();
  _line = signal<string>('');
  get line() {
    return this._line();
  }
  lines = signal<string[]>(linesData2026.map((l) => l.name));
  lineOptions = computed(() => {
    return this.lines().map((l) => {
      return {
        label: l,
        value: l,
      };
    });
  });
  setLine(lineName: string) {
    this._line.set(lineName);
  }
  onLineChange(lineName: string | string[]) {
    this._line.set(lineName as string);
    if (this.model) {
      this.removeCurrentModel();
    }
    this.createModel();
  }
  model?: PatrollingLine;
  tours: PatrollingType.TourDto[] = [];
  hasValidTour = signal(false);
  intervalFetchTours$ = interval(5000);
  intervalFetchToursSubscription?: Subscription;
  constructor(
    private api: ApiService,
    private patrollingDiagramService: PatrollingDiagramService,
  ) {}

  ngOnInit() {
    this.setLine(this.initialLine());
  }
  ngAfterViewInit() {
    this.createModel();
  }
  createModel() {
    const model = this.patrollingDiagramService.getLineDiagramModel(this.line);
    if (!model) return;
    model.updateWrapper({
      width: this.diagram.nativeElement.offsetWidth,
      height: this.diagram.nativeElement.offsetHeight - 46,
    });
    model.bootstrap(this.diagram.nativeElement);
    this.model = model;
    this.fetchTours();
    this.intervalFetchToursSubscription = this.intervalFetchTours$.subscribe(
      () => {
        this.fetchTours();
      },
    );
  }
  async fetchTours() {
    if (!this.visible()) return;
    const tours = await this.api.patrolling.getTourList();
    this.afterFetchTours(tours);
  }
  afterFetchTours(tours: PatrollingType.TourDto[]) {
    const currentLineTours = tours.filter((t) => t.line === this.line);
    const previous = this.tours.slice();
    this.setValidTourFlag(currentLineTours);
    this.dealWithTours(currentLineTours, previous);
    this.tours = currentLineTours;
  }
  dealWithTours(
    current: PatrollingType.TourDto[],
    previous: PatrollingType.TourDto[],
  ) {
    const { added, removed } = diffTours(current, previous);
    if (added.length) {
      this.model?.addTours(added);
    }
    if (removed.length) {
      this.model?.removeTours(removed);
    }
  }
  setValidTourFlag(tours: PatrollingType.TourDto[]) {
    if (!this.model) {
      this.hasValidTour.set(false);
      return;
    }
    this.hasValidTour.set(validateTours(tours, this.model));
  }
  removeCurrentModel() {
    this.model?.destroy();
    this.hasValidTour.set(false);
    this.tours = [];
    this.intervalFetchToursSubscription?.unsubscribe();
  }

  ngOnDestroy() {
    this.intervalFetchToursSubscription?.unsubscribe();
  }
}
