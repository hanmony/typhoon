import {
  Component,
  ElementRef,
  input,
  output,
  signal,
  ViewChild,
  ViewContainerRef,
} from '@angular/core';
import { NzDropDownModule } from 'ng-zorro-antd/dropdown';
import { NzModalRef, NzModalService } from 'ng-zorro-antd/modal';
import { interval, Subscription } from 'rxjs';
import { ExtremeSelectComponent } from '../../../common.component/extreme-select/extreme-select.component';
import {
  PatrollingConfigComponent,
  PatrollingConfigData,
} from '../../../common.component/patrolling-config/patrolling-config.component';
import { ApiService } from '../../../services/api.service';
import { PatrollingDiagramService } from '../../../shared/patrolling/patrolling.diagram.service';
import { PatrollingLine } from '../../../shared/patrolling/patrolling.line.class';
import PatrollingTour from '../../../shared/patrolling/patrolling.tour.class';
import {
  diffTours,
  validateTours,
} from '../../../shared/patrolling/patrolling.utils';
import { linesData2026 } from '../../case-detail/services/meta';

@Component({
  selector: 'occ-simulate-patrolling',
  imports: [NzDropDownModule, ExtremeSelectComponent],
  templateUrl: './simulate-patrolling.component.html',
  styleUrl: './simulate-patrolling.component.less',
})
export class OccSimulatePatrollingComponent {
  @ViewChild('bgBox') bgBox!: ElementRef<HTMLDivElement>;
  @ViewChild('diagram') diagram!: ElementRef<HTMLDivElement>;
  pcModal?: NzModalRef<PatrollingConfigComponent, any>;
  model?: PatrollingLine;
  hasValidTour = signal(false);
  onClose = output<void>();
  onLocationQuery = output<boolean>();
  showMessage = output<string>();
  removeMessage = output();

  // onLocationConfirm = output<void>();
  // onLocationCancel = output<void>();

  cacheTour: PatrollingTour | undefined;

  currentLine = input('');
  get line() {
    return this.currentLine();
  }
  lineOptions = linesData2026.map((l) => {
    return {
      label: l.name,
      value: l.name,
    };
  });
  onLineChange(line: string | string[]) {
    throw new Error('Changing the line at OCC is forbidden.');
  }

  tours: PatrollingType.TourDto[] = [];
  intervalFetchTours$ = interval(5000);
  intervalFetchToursSubscription?: Subscription;
  constructor(
    private viewContainerRef: ViewContainerRef,
    private patrollingDiagramService: PatrollingDiagramService,
    private modal: NzModalService,
    private api: ApiService,
  ) {}
  handleClose() {
    this.onClose.emit();
    this.removeMessage.emit();
  }
  ngAfterViewInit() {
    const model = this.patrollingDiagramService.getLineDiagramModel(this.line);
    if (!model) return;
    model.showMessage = this.onMessage.bind(this);
    model.queryMessageConfirm = this.onQueryMessageConfirm.bind(this);

    model.updateWrapper({
      width: this.bgBox.nativeElement.offsetWidth,
      height: this.bgBox.nativeElement.offsetHeight - 78 - 46,
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
  onAddTrain() {
    this.model?.pickupTour((tour: PatrollingTour) => {
      this.cacheTour = tour;
      this.createConfigModal();
    });
  }
  onQueryToRemove(tour: PatrollingType.TourDto) {
    this.modal.error({
      nzClassName: 'patrolling-confirm-modal',
      nzTitle: `确定删除${tour.serialNumber}号车吗？`,
      nzContent: '删除操作无法还原',
      nzCancelText: '取消',
      nzOnOk: async () => await this.onRemoveTrain(tour),
    });
  }
  onQueryToReset() {
    this.modal.error({
      nzClassName: 'patrolling-confirm-modal',
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
  closeConfigModal() {
    if (this.pcModal) {
      this.pcModal.close();
      this.pcModal.destroy();
      this.pcModal = undefined;
    }
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
  ngOnDestroy() {
    this.intervalFetchToursSubscription?.unsubscribe();
  }
}
