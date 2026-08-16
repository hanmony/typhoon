import {
  Component,
  computed,
  effect,
  ElementRef,
  input,
  output,
  signal,
  ViewChild,
} from '@angular/core';
import dayjs from 'dayjs';
import { NzInputModule } from 'ng-zorro-antd/input';
import { NzSwitchModule } from 'ng-zorro-antd/switch';
import { interval, Subscription } from 'rxjs';
import { LibraryNzModule } from '../../../../library.nz.module';
import { ApiService } from '../../../../services/api.service';
import { AutoScrollComponent } from '../../../../shared/auto.scroll';
import { PatrollingDiagramService } from '../../../../shared/patrolling/patrolling.diagram.service';
import PatrollingTour from '../../../../shared/patrolling/patrolling.tour.class';
import { getPositionTextFromDto } from '../../../../shared/shared.event.effect';
import { getLineMark, lineNames } from '../../../case-detail/services/meta';
import { StateTagComponent } from '../event-table/state-tag/state-tag.component';

export interface Collection {
  key: string;
  state: string;
  stateColor: string;
  startTime: string;
  actualEndTime: string;
  operations: ExtremeOcc.Operation[];
}
export interface LineCollection {
  line: string;
  collections: Collection[];
  total: number;
  patrollingInfo?: PatrollingStatistic;
  detailInfo?: ExtremeOcc.OpDetail;
}

export interface PatrollingStatistic {
  name: string;
  patrolling: boolean;
  finished: boolean;
  expiration: number;
  endTime: number;
  currentCount?: number;
}

@Component({
  selector: 'dashboard-operation-table',
  imports: [LibraryNzModule, NzInputModule, NzSwitchModule, StateTagComponent],
  templateUrl: './operation-table.component.html',
  styleUrl: './operation-table.component.less',
})
export class OperationTableComponent extends AutoScrollComponent<HTMLDivElement> {
  @ViewChild('tbodyRef')
  override scrollContainer!: ElementRef<HTMLDivElement>;

  paginationConfig = input.required<{
    pageSize: number;
    pageIndex: number;
    autoTurn: boolean;
  }>();

  isCOCC = input(false);
  openPatrollingLine = output<string>();
  maxHeight = computed(() => (this.isCOCC() ? 'calc(100vh - 256px)' : '880px'));
  operations = input<ExtremeOcc.Operation[]>([]);
  orderConfig = signal({
    prop: 'index',
    asc: false,
  });

  detailTextFormState = signal({
    editing: false,
    key: '',
    value: '',
  });

  detailObstructingFormState = signal({
    editing: false,
    key: '',
    value: 0,
  });

  isFetchingDetail = signal(false);

  intervalUpdateData$ = interval(10000);
  intervalUpdateDataSubscription?: Subscription;

  intervalFetchData$ = interval(30000);
  intervalFetchDataSubscription?: Subscription;

  patrollingData: PatrollingStatistic[] = lineNames.map((l) => {
    return {
      name: l,
      patrolling: false,
      finished: false,
      expiration: 0,
      endTime: Date.now(),
      currentCount: 0,
    };
  });
  opDetailData: ExtremeOcc.OpDetail[] = [];

  dataSet = signal<LineCollection[]>(
    lineNames.map((l) => ({ line: l, collections: [], total: 0 })),
  );
  constructor(
    private api: ApiService,
    private patrollingService: PatrollingDiagramService,
  ) {
    super();
    effect(() => {
      this.setDataSet();
      this.setFixHeight();
      this.setScrollHeight();
    });
  }

  ngOnInit() {
    this.fetchData();
  }

  override ngAfterViewInit() {
    this.intervalFetchDataSubscription = this.intervalUpdateData$.subscribe(
      this.fetchData.bind(this),
    );
    this.intervalUpdateDataSubscription = this.intervalUpdateData$.subscribe(
      this.updatePatrollingData.bind(this),
    );

    // 覆盖父类的自动滚动启动
    if (this.paginationConfig().autoTurn) {
      // 不自动滚动，手动点击‘自动翻页’功能按钮时，再开启自动滚动
      this.setAutoScrollEnabled(true);
    }

    this.setScrollHeight();
  }

  fetchData() {
    this.fetchTours();
    this.fetchOpDetails();
  }

  async fetchOpDetails() {
    this.isFetchingDetail.set(true);
    try {
      const data = await this.api.extreme.getOpDetailList();
      this.isFetchingDetail.set(false);
      this.opDetailData = data;
      this.dataSet.update((prev) => {
        return prev.map((l) => {
          const detailInfo = data.find((d) => d.line === l.line);
          return {
            ...l,
            detailInfo,
          };
        });
      });
    } catch (err) {
      this.isFetchingDetail.set(false);
    }
  }

  override ngOnDestroy() {
    super.ngOnDestroy();
    this.intervalUpdateDataSubscription?.unsubscribe();
    this.intervalFetchDataSubscription?.unsubscribe();
  }

  async fetchTours() {
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

    this.patrollingData.forEach((line) => {
      const lineMeta = this.patrollingService.getLineMeta(line.name);
      if (!lineMeta || !lineMap.get(line.name)) {
        line.patrolling = false;
        line.finished = true;
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
        line.finished = false;
        line.endTime = maxEndDate;
        line.currentCount = currentLineTours.length;
      }
    });

    this.updatePatrollingData();
  }

  updatePatrollingData() {
    this.patrollingData.forEach((line) => {
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

  setDataSet() {
    const ops = this.operations();
    const sameKeyMap = new Map<string, Collection>();
    ops.forEach((op) => {
      const key = this.getOperationKey(op);
      const curMap = sameKeyMap.get(key);
      if (curMap) {
        curMap.operations.push(op);
      } else {
        sameKeyMap.set(key, {
          key,
          state: this.getStateText(op),
          stateColor: this.getStateColor(op),
          startTime: op.startTime,
          actualEndTime: op.actualEndTime,
          operations: [op],
        });
      }
    });
    const result = lineNames.map((l) => {
      return {
        line: l,
        total: 0,
        collections: Array.from(sameKeyMap.values()).filter((c) =>
          c.operations.some((op) => op.line === l),
        ),
        patrollingInfo: this.patrollingData.find((p) => p.name === l),
        detailInfo: this.opDetailData.find((d) => d.line === l),
      };
    });
    result.forEach((l) => {
      l.total = l.collections.reduce((acc, c) => acc + c.operations.length, 0);
    });
    this.dataSet.set(result);
  }

  handleOrdering(prop: string) {}

  getLineMark(line: string) {
    return getLineMark(line);
  }

  getStateText(op: ExtremeOcc.Operation) {
    const now = Date.now();
    if (new Date(op.startTime).getTime() > now) {
      return '未开始';
    }
    if (op.actualEndTime) {
      if (new Date(op.actualEndTime).getTime() < now) {
        return '已结束'; // ! 该状态的运营数据已在上游组件过滤
      }
    }
    return '进行中';
  }

  getStateColor(op: ExtremeOcc.Operation) {
    const text = this.getStateText(op);
    if (text === '进行中') {
      return '#FFA11B';
    }
    return '#A5B2C8';
  }

  getCollectionStateText(collection: Collection) {
    return collection.state;
  }

  getPositionText(op: ExtremeOcc.Operation) {
    return getPositionTextFromDto(op);
  }

  getTimeText(time: string) {
    if (!time) return '';
    return dayjs(time).format('MM/DD HH:mm');
  }
  getOperationKey(op: ExtremeOcc.Operation) {
    if (op.actionType !== '站点关闭') {
      return `${op.line}-${op.actionType}-${op.close}-${this.getTimeText(op.startTime)}`;
    }
    return `${op.line}-${op.actionType}-${this.getTimeText(op.startTime)}`;
  }

  getOperationDetailText(lineVO: LineCollection) {
    const detailText = lineVO.detailInfo?.detail;
    return detailText;
  }
  getObstructText(lineVO: LineCollection) {
    return lineVO.detailInfo?.isObstructing === 1 ? '是' : '';
  }

  formatExpirationInMinutes(ms: number) {
    const minutes = Math.ceil(ms / 60 / 1000);
    return `${minutes}min`;
    // const second = Math.floor((ms % (60 * 1000)) / 1000);
    // const formattedMinutes = String(minutes).padStart(2, '0');
    // return formattedMinutes;
  }

  showDetailTextModifyCell(lineVO: LineCollection) {
    this.detailTextFormState.set({
      editing: true,
      key: lineVO.line,
      value: lineVO.detailInfo?.detail || '',
    });
  }

  showObstructModifyCell(lineVO: LineCollection) {
    this.detailObstructingFormState.set({
      editing: true,
      key: lineVO.line,
      value: lineVO.detailInfo?.isObstructing || 0,
    });
  }

  async confirmDetailTextModify(lineVO: LineCollection) {
    await this.editOpDetailText(lineVO, this.detailTextFormState().value);
    this.fetchOpDetails();
    this.hideDetailTextModifyCell();
  }

  hideDetailTextModifyCell() {
    this.detailTextFormState.set({
      editing: false,
      key: '',
      value: '',
    });
  }

  async confirmObstructModify(lineVO: LineCollection) {
    await this.editOpDetailObstructing(
      lineVO,
      this.detailObstructingFormState().value,
    );
    this.fetchOpDetails();
    this.hideObstructModifyCell();
  }

  hideObstructModifyCell() {
    this.detailObstructingFormState.set({
      editing: false,
      key: '',
      value: 0,
    });
  }

  createOpDetailTextModal(lineVO: LineCollection) {}

  addOpDetailRecord(line: string, isObstructing: number, detail: string) {
    return this.api.extreme.addOpDetail({ line, isObstructing, detail });
  }
  editOpDetailText(lineVO: LineCollection, text: string) {
    const detailInfo = lineVO.detailInfo;
    if (!detailInfo) return this.addOpDetailRecord(lineVO.line, 0, text);
    return this.api.extreme.updateOpDetail({ ...detailInfo, detail: text });
  }

  editOpDetailObstructing(lineVO: LineCollection, isObstructing: number) {
    const detailInfo = lineVO.detailInfo;
    if (!detailInfo)
      return this.addOpDetailRecord(lineVO.line, isObstructing, '');
    return this.api.extreme.updateOpDetail({ ...detailInfo, isObstructing });
  }
}
