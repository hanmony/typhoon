import {
  Component,
  computed,
  ElementRef,
  input,
  output,
  signal,
  ViewChild,
} from '@angular/core';
import { NzDropDownModule } from 'ng-zorro-antd/dropdown';
import { NzModalRef, NzModalService } from 'ng-zorro-antd/modal';
import { interval, Subscription } from 'rxjs';
import PatrollingTour from '../../../../../shared/patrolling/patrolling.tour.class';
import {
  diffTours,
  validateTours,
} from '../../../../../shared/patrolling/patrolling.utils';
import { linesData2026 } from '../../../../case-detail/services/meta';
import { ExtremeSelectComponent } from './../../../../../common.component/extreme-select/extreme-select.component';
import {
  PatrollingConfigComponent,
  PatrollingConfigData,
} from './../../../../../common.component/patrolling-config/patrolling-config.component';
import { ApiService } from './../../../../../services/api.service';
import { PatrollingDiagramService } from './../../../../../shared/patrolling/patrolling.diagram.service';
import { PatrollingLine } from './../../../../../shared/patrolling/patrolling.line.class';

@Component({
  selector: 'cocc-patrolling-detail',
  imports: [NzDropDownModule, ExtremeSelectComponent],
  templateUrl: './patrolling-detail.component.html',
  styleUrl: './patrolling-detail.component.less',
})
export class CoccPatrollingDetailComponent {
  @ViewChild('box') box!: ElementRef<HTMLDivElement>;
  @ViewChild('diagram') diagram!: ElementRef<HTMLDivElement>;
  onReturn = output<void>();
  onLocationQuery = output<boolean>();
  showMessage = output<string>();

  initialLine = input('1号线');
  _line = signal<string>('1号线');
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
  cacheTour: PatrollingTour | undefined;
  pcModal?: NzModalRef<PatrollingConfigComponent, any>;
  hasValidTour = signal(false);
  intervalFetchTours$ = interval(5000);
  intervalFetchToursSubscription?: Subscription;
  constructor(
    private api: ApiService,
    private modal: NzModalService,
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
    model.showMessage = this.onMessage.bind(this);
    model.queryMessageConfirm = this.onQueryMessageConfirm.bind(this);
    model.updateWrapper({
      width: this.diagram.nativeElement.offsetWidth,
      height: this.diagram.nativeElement.offsetHeight - 76 - 48,
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

  onAddTrain() {
    this.model?.pickupTour((tour: PatrollingTour) => {
      this.cacheTour = tour;
      this.createConfigModal();
    });
  }
  onQueryToRemove(tour: PatrollingType.TourDto) {
    this.modal.error({
      nzClassName: 'patrolling-confirm-modal',
      nzCentered: true,
      nzTitle: `确定删除${tour.serialNumber}号车吗？`,
      nzContent: '删除操作无法还原',
      nzCancelText: '取消',
      nzOnOk: async () => await this.onRemoveTrain(tour),
    });
  }
  onQueryToReset() {
    this.modal.error({
      nzClassName: 'patrolling-confirm-modal',
      nzCentered: true,
      nzTitle: `所有巡道数据将删除？`,
      nzContent: '删除操作无法还原',
      nzCancelText: '取消',
      nzOnOk: async () => await this.onReset(),
    });
  }
  async onRemoveTrain(tour: PatrollingType.TourDto) {
    await this.api.patrolling.removeTour(tour.id);
    await this.fetchTours();
  }

  async onReset() {
    await this.api.patrolling.removeAllOnLine(this.line);
    await this.fetchTours();
  }
  createConfigModal() {
    this.closeConfigModal();
    this.pcModal = this.modal.create<
      PatrollingConfigComponent,
      PatrollingConfigData
    >({
      nzContent: PatrollingConfigComponent,

      nzClassName: 'patrolling-config-modal',
      nzClosable: false,
      nzData: {
        initData: this.cacheTour!,
        onConfirm: this.onAddTrainConfirm.bind(this),
        onCancel: this.cancellingAddTrain.bind(this),
      },
      // nzWidth: '94vw',
      nzKeyboard: false,
      nzWidth: 256,
      nzMaskClosable: false,
      nzMaskStyle: {
        backgroundColor: 'transparent',
      },
      nzFooter: null,
    });
  }
  closeConfigModal() {
    if (this.pcModal) {
      this.pcModal.close();
      this.pcModal.destroy();
      this.pcModal = undefined;
    }
  }
  handleReturn() {
    this.onReturn.emit();
  }
  async onAddTrainConfirm(p: { speed: number; startTime: Date }) {
    this.model?.exitPickupTour();
    // 直接操作 tour instance
    const { speed, startTime } = p;
    this.cacheTour?.setStartTime(startTime.toISOString());
    this.cacheTour?.setSpeed(speed);
    await this.api.patrolling.addTour(this.cacheTour!.meta);
    this.fetchTours();
    this.closeConfigModal();
  }
  cancellingAddTrain() {
    this.cacheTour = undefined;
    this.model?.exitPickupTour();
    this.closeConfigModal();
  }
  cancelSelectingStations() {
    this.cacheTour = undefined;
    this.model?.exitPickupTour();
  }

  onMessage(msg: string) {
    this.showMessage.emit(msg);
  }
  onQueryMessageConfirm(b: boolean) {
    this.onLocationQuery.emit(b);
  }
  onMessageConfirm() {
    this.model?.onMessageConfirm();
  }
  onMessageCancel() {
    this.model?.onMessageCancel();
  }

  ngOnDestroy() {
    this.intervalFetchToursSubscription?.unsubscribe();
  }
}
